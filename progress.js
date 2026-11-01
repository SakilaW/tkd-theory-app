function cls(percent) {
 return percent>=80?"g":percent>=60?"a":"r";
}

function agg(list,questions) {
 let answered=0,correct=0,seen=0;
 for(const question of list) {
  const result=questions[questionKey(question)];
  if(result) {
   seen++;
   answered+=result.a;
   correct+=result.c;
  }
 }
 return {a:answered,c:correct,seen,total:list.length,pct:answered?Math.round(correct/answered*100):null};
}

function row(name,summary,inner) {
 const percent=summary.pct,key=percent===null?"n":cls(percent);
 const heading=`<div class="top"><span class="name">${escapeHtml(name)}</span><span class="pct t${key}">${percent===null?"Not practised":percent+"% correct"}</span></div><div class="bar"><div class="${key}" style="width:${percent===null?0:percent}%"></div></div><div class="sub">${summary.seen}/${summary.total} seen · ${summary.a} answered</div>`;
 return inner?`<details class="grp prow"><summary>${heading}</summary><div class="inner">${inner}</div></details>`:`<div class="prow">${heading}</div>`;
}

function renderProgress() {
 const questions=loadQ();
 $("progRank").innerHTML=rankOptions.map(rank=>{
  const rankQuestions=all.filter(question=>(question.rank||NO_RANK_LABEL)===rank);
  if(!rankQuestions.length)return "";
  const inner=[...new Set(rankQuestions.map(question=>question.cat))].sort().map(topic=>row(topic,agg(rankQuestions.filter(question=>question.cat===topic),questions))).join("");
  return row(rank,agg(rankQuestions,questions),inner);
 }).join("");
 $("progTopic").innerHTML=topics.map(topic=>{
  const topicQuestions=all.filter(question=>question.cat===topic);
  const inner=rankOptions.filter(rank=>topicQuestions.some(question=>(question.rank||NO_RANK_LABEL)===rank)).map(rank=>row(rank,agg(topicQuestions.filter(question=>(question.rank||NO_RANK_LABEL)===rank),questions))).join("");
  return row(topic,agg(topicQuestions,questions),inner);
 }).join("");
 renderHistory();
}

function renderHistory() {
 const history=loadProgress().history.slice(0,window.QUIZ_HISTORY_LIMIT);
 if(!history.length) {
  $("quizHistory").innerHTML='<p class="history-empty">No completed quizzes yet.</p>';
  return;
 }
 $("quizHistory").innerHTML=history.map((attempt,index)=>{
  const date=Date.parse(attempt.completedAt);
  const dateLabel=Number.isNaN(date)?"Date unavailable":new Date(date).toLocaleString();
  const questions=Array.isArray(attempt.questions)?attempt.questions:[];
  const reviewedQuestions=questions.map((question,questionIndex)=>{
   const selected=question.selected;
   const options=(Array.isArray(question.options)?question.options:[]).map((option,optionIndex)=>{
    const correct=option===question.a;
    const chosen=option===selected;
    const resultClass=correct?"review-option-correct":chosen?"review-option-incorrect":"";
    const status=chosen?(correct?"Your answer · Correct":"Your answer"):correct?"Correct answer":"";
    return `<button type="button" class="option review-option ${resultClass}" disabled>
     <span class="letter">${String.fromCharCode(65+optionIndex)}</span>${escapeHtml(option)}
     ${status?`<span class="review-option-status">${escapeHtml(status)}</span>`:""}
    </button>`;
   }).join("");
   return `<article class="review history-review">
    <span class="tag">${escapeHtml(question.cat||"")}</span><span class="tag">${escapeHtml(question.rank||NO_RANK_LABEL)}</span>
    <p><strong>${questionIndex+1}. ${escapeHtml(question.q||"")}</strong></p>
    ${question.image?`<img class="pattern-diagram" src="${escapeHtml(question.image)}" alt="Pattern diagram shown in question">`:""}
    <div class="review-options">${options}</div>
    ${selected===null?'<p class="muted">Not answered</p>':""}
    ${question.why?`<p class="muted">${escapeHtml(question.why)}</p>`:""}
   </article>`;
  }).join("");
  return `<details class="history-attempt">
   <summary>
    <span class="history-date">${escapeHtml(dateLabel)}</span>
    <span class="history-course">${escapeHtml(attempt.course||"Quiz")}</span>
    <span class="history-score">${Number(attempt.score)||0}% · ${Number(attempt.correct)||0}/${Number(attempt.total)||questions.length} correct</span>
   </summary>
   <div class="history-questions">${reviewedQuestions||'<p class="muted">No question details were saved for this quiz.</p>'}</div>
  </details>`;
 }).join("");
}

function showProgressView(view) {
 for(const name of ["rank","topic","history"]) {
  const active=view===name;
  const suffix=name[0].toUpperCase()+name.slice(1);
  $(`progress${suffix}Panel`).hidden=!active;
  $(`showProgress${suffix}`).classList.toggle("active",active);
  $(`showProgress${suffix}`).setAttribute("aria-pressed",String(active));
 }
 $("progressLegend").hidden=view==="history";
}

function updateStats() {
 renderProgress();
}

$("showProgressRank").onclick=()=>showProgressView("rank");
$("showProgressTopic").onclick=()=>showProgressView("topic");
$("showProgressHistory").onclick=()=>showProgressView("history");
$("resetProgress").onclick=async()=>{
 if(confirm("Reset all saved progress, including quiz history, on this browser?")) {
  localStorage.removeItem("tkdProgress");
  localStorage.removeItem("tkdQ");
  updateStats();
  await window.saveProgressToCloud();
 }
};

window.addEventListener("tkd:progress-updated",updateStats);
updateStats();
