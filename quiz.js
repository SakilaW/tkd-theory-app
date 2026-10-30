function addFilterOptions(containerId,values,name) {
 const container=$(containerId);
 for(const [index,value] of values.entries()) {
  const label=document.createElement("label");
  label.className="multi-option";
  const checkbox=document.createElement("input");
  checkbox.type="checkbox";
  checkbox.name=name;
  checkbox.value=value;
  checkbox.id=`${name}-${index}`;
  checkbox.addEventListener("change",updateSetup);
  const text=document.createElement("span");
  text.textContent=value;
  label.append(checkbox,text);
  container.appendChild(label);
 }
}

addFilterOptions("rankOptions",ranks,"rank");
addFilterOptions("topicOptions",topics,"topic");

function selectedValues(name) {
 return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(option=>option.value);
}

function updateFilterSummary(name,summaryId,allLabel,selectedLabel) {
 const selected=selectedValues(name);
 $(summaryId).textContent=selected.length?`${selected.length} ${selectedLabel} selected`:allLabel;
}

let quiz=[],answers=[],index=0;

function shuffle(items) {
 for(let i=items.length-1;i>0;i--) {
  const j=Math.floor(Math.random()*(i+1));
  [items[i],items[j]]=[items[j],items[i]];
 }
 return items;
}

function buildOptions(question) {
 let wrong=question.wrong?[...question.wrong]:[];
 if(question.type==="term") {
  const pool=TERMS.filter(term=>term.en!==question.en||term.ko!==question.ko).map(term=>question.a===question.ko?term.ko:term.en);
  const same=TERMS.filter(term=>term.cat===question.cat).map(term=>question.q.startsWith("What is the Korean")?term.ko:term.en);
  wrong=[...new Set([...same,...pool])].filter(answer=>answer!==question.a);
 }
 wrong=[...new Set(wrong)].filter(answer=>answer!==question.a);
 if(wrong.length<3) {
  const pool=TERMS.map(term=>question.q.startsWith("What is the Korean")?term.ko:term.en).filter(answer=>answer!==question.a);
  wrong=[...new Set([...wrong,...pool])];
 }
 return shuffle([question.a,...shuffle(wrong).slice(0,3)]);
}

function filtered() {
 const selectedRanks=selectedValues("rank"),selectedTopics=selectedValues("topic");
 return all.filter(question=>
  (!selectedRanks.length||selectedRanks.includes(question.rank))&&
  (!selectedTopics.length||selectedTopics.includes(question.cat))
 );
}

function updateSetup() {
 const count=filtered().length,selectedRanks=selectedValues("rank"),selectedTopics=selectedValues("topic");
 updateFilterSummary("rank","rankSummary","All belt ranks","ranks");
 updateFilterSummary("topic","topicSummary","All topics","topics");
 const topicLabel=selectedTopics.length?selectedTopics.join(", "):"All topics";
 const rankLabel=selectedRanks.length?selectedRanks.join(", "):"All belt ranks";
 const scope=[topicLabel,rankLabel].join(" · ");
 $("scope").innerHTML=`<strong>${escapeHtml(scope)}</strong> · ${count} question${count===1?"":"s"} available`;
 $("start").disabled=count===0;
}

$("clearRanks").addEventListener("click",()=>{
 document.querySelectorAll('input[name="rank"]:checked').forEach(option=>{option.checked=false});
 updateSetup();
});
$("clearTopics").addEventListener("click",()=>{
 document.querySelectorAll('input[name="topic"]:checked').forEach(option=>{option.checked=false});
 updateSetup();
});

function start(list=null) {
 let pool=list||filtered();
 pool=shuffle([...pool]);
 const count=list?pool.length:$("count").value==="all"?pool.length:Number($("count").value);
 quiz=pool.slice(0,Math.min(count,pool.length)).map(question=>({...question,options:buildOptions(question)}));
 answers=Array(quiz.length).fill(null);
 index=0;
 $("setup").style.display="none";
 $("results").style.display="none";
 $("quiz").style.display="block";
 render();
 window.scrollTo(0,0);
}

function render() {
 const question=quiz[index];
 $("qcounter").textContent=`Question ${index+1} of ${quiz.length}`;
 $("qmeta").textContent=`${question.cat} · ${question.rank}`;
 $("bar").style.width=(index+1)/quiz.length*100+"%";
 $("questionText").textContent=question.q;
 $("questionMedia").innerHTML=question.image?`<img class="pattern-diagram" src="${escapeHtml(question.image)}" alt="Pattern diagram for visual identification question">`:"";
 $("options").innerHTML="";
 question.options.forEach((option,i)=>{
  const button=document.createElement("button");
  button.className="option"+(answers[index]===option?" selected":"");
  button.innerHTML=`<span class="letter">${String.fromCharCode(65+i)}</span>${escapeHtml(option)}`;
  button.onclick=()=>{answers[index]=option;render()};
  $("options").appendChild(button);
 });
 $("prev").disabled=index===0;
 $("next").style.display=index===quiz.length-1?"none":"inline-block";
 $("submit").style.display=index===quiz.length-1?"inline-block":"none";
 $("answeredCount").textContent=`${answers.filter(answer=>answer!==null).length} of ${quiz.length} answered`;
}

function renderBreakdown() {
 const group=(key,order)=>{
  const groups={};
  quiz.forEach((question,i)=>{
   const summary=groups[question[key]]||(groups[question[key]]={a:0,c:0,seen:0,total:0});
   summary.a++;
   summary.seen++;
   summary.total++;
   if(answers[i]===question.a)summary.c++;
  });
  return (order||Object.keys(groups).sort()).filter(name=>groups[name]).map(name=>{
   const summary=groups[name];
   summary.pct=Math.round(summary.c/summary.a*100);
   const keyClass=summary.pct>=80?"g":summary.pct>=60?"a":"r";
   const header=`<div class="top"><span class="name">${escapeHtml(name)}</span><span class="pct t${keyClass}">${summary.pct}% correct</span></div><div class="bar"><div class="${keyClass}" style="width:${summary.pct}%"></div></div><div class="sub">${summary.c}/${summary.a} correct this quiz</div>`;
   return `<div class="prow">${header}</div>`;
  }).join("");
 };
 $("resBreak").innerHTML=`<div class="muted">By rank</div>${group("rank",ranks)}<div class="muted" style="margin-top:10px">By topic</div>${group("cat")}`;
}

async function submitQuiz() {
 const correct=quiz.reduce((total,question,i)=>total+(answers[i]===question.a?1:0),0);
 const percent=Math.round(correct/quiz.length*100);
 const progress=loadProgress();
 progress.quizzes++;
 progress.best=Math.max(progress.best,percent);
 progress.last=percent;
 localStorage.setItem("tkdProgress",JSON.stringify(progress));
 const questions=loadQ();
 quiz.forEach((question,i)=>{
  const key=questionKey(question);
  const result=questions[key]||(questions[key]={a:0,c:0});
  result.a++;
  if(answers[i]===question.a)result.c++;
 });
 localStorage.setItem("tkdQ",JSON.stringify(questions));
 await window.saveProgressToCloud();
 renderBreakdown();
 $("quiz").style.display="none";
 $("results").style.display="block";
 $("score").textContent=percent+"%";
 $("rightCount").textContent=`${correct}/${quiz.length}`;
 $("wrongCount").textContent=quiz.length-correct;
 $("resultMessage").textContent=percent>=90?"Excellent work — keep the recall sharp.":percent>=70?"Good progress. Review the missed answers and try again.":"Good practice. Focus on the missed terminology and theory, then retest.";
 $("reviewList").innerHTML="";
 quiz.forEach((question,i)=>{
  const isCorrect=answers[i]===question.a;
  const review=document.createElement("div");
  review.className="review";
  review.innerHTML=`<span class="tag">${escapeHtml(question.cat)}</span><span class="tag">${escapeHtml(question.rank)}</span><p><strong>${i+1}. ${escapeHtml(question.q)}</strong></p>${question.image?`<img class="pattern-diagram" src="${escapeHtml(question.image)}" alt="Pattern diagram shown in question">`:""}<p class="${isCorrect?"correct":"incorrect"}">${isCorrect?"Correct":"Your answer: "+escapeHtml(answers[i]??"Not answered")}</p><p><strong>Correct answer:</strong> ${escapeHtml(question.a)}</p><p class="muted">${escapeHtml(question.why||"")}</p>`;
  $("reviewList").appendChild(review);
 });
 $("retryWrong").disabled=correct===quiz.length;
 window.scrollTo(0,0);
}

$("prev").onclick=()=>{index--;render()};
$("next").onclick=()=>{index++;render()};
$("submit").onclick=submitQuiz;
$("start").onclick=()=>start();
$("newQuiz").onclick=()=>{
 $("results").style.display="none";
 $("setup").style.display="block";
 window.scrollTo(0,0);
};
$("retryWrong").onclick=()=>{
 const wrong=quiz.filter((question,i)=>answers[i]!==question.a);
 start(wrong);
};
updateSetup();
