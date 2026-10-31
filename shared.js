const $ = id => document.getElementById(id);
window.QUIZ_HISTORY_LIMIT=10;

function escapeHtml(value) {
 return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function questionKey(question) {
 return question.type==="diagram"?`${question.q}::${question.rank}`:question.q;
}

function loadQ() {
 try {
  const questions=JSON.parse(localStorage.getItem("tkdQ")||"{}");
  const legacyDiagramKey="Which pattern is shown in this diagram?";
  const firstDiagramKey=`${legacyDiagramKey}::Yellow stripe`;
  if(questions[legacyDiagramKey]&&!questions[firstDiagramKey]) {
   questions[firstDiagramKey]=questions[legacyDiagramKey];
   delete questions[legacyDiagramKey];
   localStorage.setItem("tkdQ",JSON.stringify(questions));
  }
  return questions;
 } catch(error) {
  console.error("Could not read saved question progress.",error);
  return {};
 }
}

function loadProgress() {
 try {
  const progress=JSON.parse(localStorage.getItem("tkdProgress")||'{"quizzes":0,"best":0,"last":null}');
  return progress&&typeof progress==="object"
   ?{...progress,history:Array.isArray(progress.history)?progress.history:[]}
   :{quizzes:0,best:0,last:null,history:[]};
 } catch(error) {
  console.error("Could not read saved quiz progress.",error);
  return {quizzes:0,best:0,last:null,history:[]};
 }
}
