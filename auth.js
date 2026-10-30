const SUPABASE_CONFIG_KEY="tkdSupabaseConfig";
const PROGRESS_OWNER_KEY="tkdProgressOwner";
const PROGRESS_SNAPSHOT_KEY="tkdCloudSnapshot";
let supabaseClient=null;
let currentUser=null;
let initializedUserId=null;
let authSubscription=null;

function setSyncMessage(message,state="local") {
 const messageElement=$("syncMessage");
 const badge=$("syncBadge");
 if(messageElement)messageElement.textContent=message;
 if(badge) {
  badge.textContent=state==="synced"?"Synced":state==="error"?"Sync issue":state==="account"?"Account":"On this device";
  badge.dataset.state=state;
 }
}

function setAccountUi(user) {
 const configured=$("syncConfigured");
 const unconfigured=$("syncNotConfigured");
 const signedOut=$("signedOut");
 const signedIn=$("signedIn");
 if(configured)configured.hidden=!supabaseClient;
 if(unconfigured)unconfigured.hidden=Boolean(supabaseClient);
 if(signedOut)signedOut.hidden=Boolean(user);
 if(signedIn)signedIn.hidden=!user;
 if(user) {
  $("accountEmail").textContent=user.email||"Signed in";
  setSyncMessage("Signed in. Progress syncs to your account after each quiz.","account");
 } else if(supabaseClient) {
  setSyncMessage("Sign in to sync progress. You can still practise and save on this device.","local");
 } else {
  setSyncMessage("Progress is saved on this device until you connect an account.","local");
 }
}

function readSupabaseConfig() {
 try {
  const config=JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY)||"null");
  return config&&typeof config.url==="string"&&typeof config.key==="string"?config:null;
 } catch(error) {
  console.error("Could not read the saved Supabase connection settings.",error);
  setSyncMessage("Could not read saved connection settings. Re-enter your Supabase project URL and key.","error");
  return null;
 }
}

function clearLocalProgress() {
 localStorage.removeItem("tkdProgress");
 localStorage.removeItem("tkdQ");
}

function mergeLocalProgress(quizSummary,questionStats,baseline=null) {
 const localSummary=loadProgress();
 const localQuestions=loadQ();
 const mergedQuestions={...questionStats};
 for(const [key,result] of Object.entries(localQuestions)) {
  const previous=baseline?.questionStats?.[key]||{a:0,c:0};
  const attempts=Math.max(0,(result.a||0)-(previous.a||0));
  const correct=Math.max(0,(result.c||0)-(previous.c||0));
  if(!attempts&&!correct)continue;
  const cloudResult=mergedQuestions[key]||{a:0,c:0};
  mergedQuestions[key]={
   a:(cloudResult.a||0)+attempts,
   c:(cloudResult.c||0)+correct
  };
 }
 const newQuizzes=Math.max(0,(localSummary.quizzes||0)-(baseline?.quizSummary?.quizzes||0));
 return {
  summary:{
   quizzes:(quizSummary.quizzes||0)+newQuizzes,
   best:newQuizzes?Math.max(quizSummary.best||0,localSummary.best||0):quizSummary.best||0,
   last:newQuizzes?localSummary.last:quizSummary.last
  },
  questions:mergedQuestions
 };
}

function saveCloudSnapshot(userId,quizSummary,questionStats) {
 localStorage.setItem(PROGRESS_SNAPSHOT_KEY,JSON.stringify({userId,quizSummary,questionStats}));
}

function readCloudSnapshot(userId) {
 try {
  const snapshot=JSON.parse(localStorage.getItem(PROGRESS_SNAPSHOT_KEY)||"null");
  return snapshot?.userId===userId?snapshot:null;
 } catch(error) {
  console.error("Could not read the saved cloud progress snapshot.",error);
  return null;
 }
}

function notifyProgressUpdated() {
 window.dispatchEvent(new Event("tkd:progress-updated"));
}

async function syncAccountProgress(user) {
 const {data,error}=await supabaseClient
  .from("tkd_progress")
  .select("quiz_summary,question_stats")
  .eq("user_id",user.id)
  .maybeSingle();
 if(error)throw error;

 if(data) {
  const previousOwner=localStorage.getItem(PROGRESS_OWNER_KEY);
  const baseline=previousOwner===user.id?readCloudSnapshot(user.id):null;
  if(!previousOwner||baseline) {
   const localSummary=loadProgress(),localQuestions=loadQ();
   const hasUnsyncedProgress=baseline
    ?localSummary.quizzes>(baseline.quizSummary?.quizzes||0)||Object.entries(localQuestions).some(([key,result])=>{
      const previous=baseline.questionStats?.[key]||{a:0,c:0};
      return result.a>(previous.a||0)||result.c>(previous.c||0);
     })
    :localSummary.quizzes||Object.keys(localQuestions).length;
   if(hasUnsyncedProgress) {
    const merged=mergeLocalProgress(data.quiz_summary,data.question_stats,baseline);
    localStorage.setItem("tkdProgress",JSON.stringify(merged.summary));
    localStorage.setItem("tkdQ",JSON.stringify(merged.questions));
    localStorage.setItem(PROGRESS_OWNER_KEY,user.id);
    const saved=await window.saveProgressToCloud();
    notifyProgressUpdated();
    if(saved)setSyncMessage("Your local progress was combined with this account’s saved progress.","synced");
    return;
   }
  }
  localStorage.setItem("tkdProgress",JSON.stringify(data.quiz_summary));
  localStorage.setItem("tkdQ",JSON.stringify(data.question_stats));
  localStorage.setItem(PROGRESS_OWNER_KEY,user.id);
  saveCloudSnapshot(user.id,data.quiz_summary,data.question_stats);
  notifyProgressUpdated();
  setSyncMessage("Progress loaded from your account and synced on this device.","synced");
  return;
 }

 const previousOwner=localStorage.getItem(PROGRESS_OWNER_KEY);
 if(previousOwner&&previousOwner!==user.id)clearLocalProgress();
 localStorage.setItem(PROGRESS_OWNER_KEY,user.id);
 const saved=await window.saveProgressToCloud();
 notifyProgressUpdated();
 if(saved)setSyncMessage("This device’s saved progress has been added to your account.","synced");
}

async function handleAuthSession(session) {
 const user=session?.user||null;
 currentUser=user;
 setAccountUi(user);
 if(!user) {
  initializedUserId=null;
  return;
 }
 if(initializedUserId===user.id)return;
 initializedUserId=user.id;
 try {
  await syncAccountProgress(user);
 } catch(error) {
  initializedUserId=null;
  console.error("Could not load progress from Supabase.",error);
  setSyncMessage(`Could not load account progress: ${error.message}`,"error");
 }
}

function configureSupabase(config) {
 if(authSubscription) {
  authSubscription.unsubscribe();
  authSubscription=null;
 }
 supabaseClient=null;
 currentUser=null;
 initializedUserId=null;
 if(!config) {
  setAccountUi(null);
  return;
 }
 if(!window.supabase?.createClient) {
  setSyncMessage("The Supabase client library did not load. Check your connection and reload this page.","error");
  return;
 }
 try {
  const projectUrl=new URL(config.url);
  if(projectUrl.protocol!=="https:")throw new Error("The project URL must start with https://.");
  if(!config.key.trim())throw new Error("The publishable key cannot be empty.");
  supabaseClient=window.supabase.createClient(projectUrl.origin,config.key.trim());
  const {data}=supabaseClient.auth.onAuthStateChange((_event,session)=>{
   setTimeout(()=>handleAuthSession(session),0);
  });
  authSubscription=data.subscription;
  $("configuredProject").textContent=projectUrl.host;
  setAccountUi(null);
 } catch(error) {
  supabaseClient=null;
  setAccountUi(null);
  setSyncMessage(`Could not configure Supabase: ${error.message}`,"error");
 }
}

$("syncConfigForm").addEventListener("submit",event=>{
 event.preventDefault();
 const url=$("supabaseUrl").value.trim().replace(/\/+$/,"");
 const key=$("supabaseKey").value.trim();
 try {
  const parsedUrl=new URL(url);
  if(parsedUrl.protocol!=="https:")throw new Error("The project URL must start with https://.");
  if(!key)throw new Error("Paste your Supabase publishable key.");
  localStorage.setItem(SUPABASE_CONFIG_KEY,JSON.stringify({url:parsedUrl.origin,key}));
  configureSupabase({url:parsedUrl.origin,key});
  if(supabaseClient)$("syncNotConfigured").hidden=true;
 } catch(error) {
  setSyncMessage(error.message,"error");
 }
});

$("changeSupabase").onclick=()=>{
 if(currentUser) {
  setSyncMessage("Sign out before changing the connected Supabase project.","error");
  return;
 }
 if(supabaseClient)supabaseClient.auth.signOut().catch(error=>console.error("Could not sign out.",error));
 localStorage.removeItem(SUPABASE_CONFIG_KEY);
 configureSupabase(null);
 $("supabaseKey").value="";
 $("syncNotConfigured").hidden=false;
};

$("signIn").onclick=async()=>{
 const email=$("accountEmailInput").value.trim();
 const credential=document.getElementById("credentialInput").value;
 if(!email||!credential) {
  setSyncMessage("Enter your email and password first.","error");
  return;
 }
 $("signIn").disabled=true;
 $("signUp").disabled=true;
 try {
  const {error}=await supabaseClient.auth.signInWithPassword({email,password:credential});
  if(error)throw error;
 } catch(error) {
  setSyncMessage(`Could not sign in: ${error.message}`,"error");
 } finally {
  $("signIn").disabled=false;
  $("signUp").disabled=false;
 }
};

$("signUp").onclick=async()=>{
 const email=$("accountEmailInput").value.trim();
 const credential=document.getElementById("credentialInput").value;
 if(!email||!credential) {
  setSyncMessage("Enter your email and password first.","error");
  return;
 }
 $("signIn").disabled=true;
 $("signUp").disabled=true;
 try {
  const {data,error}=await supabaseClient.auth.signUp({email,password:credential});
  if(error)throw error;
  if(!data.session)setSyncMessage("Check your email to confirm your new account, then sign in.","account");
 } catch(error) {
  setSyncMessage(`Could not create account: ${error.message}`,"error");
 } finally {
  $("signIn").disabled=false;
  $("signUp").disabled=false;
 }
};

$("signOut").onclick=async()=>{
 try {
  const {error}=await supabaseClient.auth.signOut();
  if(error)throw error;
  setSyncMessage("Signed out. This device’s saved progress remains available here.","local");
 } catch(error) {
  setSyncMessage(`Could not sign out: ${error.message}`,"error");
 }
};

window.saveProgressToCloud=async()=>{
 if(!supabaseClient||!currentUser)return false;
 if(localStorage.getItem(PROGRESS_OWNER_KEY)!==currentUser.id) {
  setSyncMessage("Progress is not synced because this device belongs to a different account. Sign in again to load your account data.","error");
  return false;
 }
 try {
  const {error}=await supabaseClient.from("tkd_progress").upsert({
   user_id:currentUser.id,
   quiz_summary:loadProgress(),
   question_stats:loadQ(),
   updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)throw error;
  saveCloudSnapshot(currentUser.id,loadProgress(),loadQ());
  setSyncMessage("Progress saved to your account.","synced");
  return true;
 } catch(error) {
  console.error("Could not sync progress to Supabase.",error);
  setSyncMessage(`Progress is saved on this device, but cloud sync failed: ${error.message}`,"error");
  return false;
 }
};

configureSupabase(readSupabaseConfig());
