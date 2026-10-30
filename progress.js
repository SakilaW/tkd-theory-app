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
 const questions=loadQ(),focusCandidates=[];
 $("progRank").innerHTML=ranks.map(rank=>{
  const rankQuestions=all.filter(question=>question.rank===rank);
  if(!rankQuestions.length)return "";
  const inner=[...new Set(rankQuestions.map(question=>question.cat))].sort().map(topic=>row(topic,agg(rankQuestions.filter(question=>question.cat===topic),questions))).join("");
  return row(rank,agg(rankQuestions,questions),inner);
 }).join("");
 $("progTopic").innerHTML=topics.map(topic=>{
  const topicQuestions=all.filter(question=>question.cat===topic);
  const inner=ranks.filter(rank=>topicQuestions.some(question=>question.rank===rank)).map(rank=>row(rank,agg(topicQuestions.filter(question=>question.rank===rank),questions))).join("");
  return row(topic,agg(topicQuestions,questions),inner);
 }).join("");
 for(const topic of topics)for(const rank of ranks) {
  const matching=all.filter(question=>question.cat===topic&&question.rank===rank);
  if(matching.length)focusCandidates.push({topic,rank,summary:agg(matching,questions)});
 }
 const weak=focusCandidates.filter(item=>item.summary.a>=3&&item.summary.pct<70).sort((a,b)=>a.summary.pct-b.summary.pct).slice(0,3);
 const fresh=focusCandidates.filter(item=>item.summary.a===0).length;
 let content="";
 if(weak.length)content+=`<strong>Focus next</strong><ul>${weak.map(item=>`<li>${escapeHtml(item.topic)} · ${escapeHtml(item.rank)} — ${item.summary.pct}% correct</li>`).join("")}</ul>`;
 if(fresh&&focusCandidates.some(item=>item.summary.a>0))content+=`<p class="muted" style="margin:${weak.length?8:0}px 0 0">${fresh} rank/topic combination${fresh===1?"":"s"} not practised yet.</p>`;
 $("focusBox").innerHTML=content?`<div class="focus">${content}</div>`:"";
}

function updateStats() {
 renderProgress();
 const progress=loadProgress();
 $("statQuizzes").textContent=progress.quizzes;
 $("statBest").textContent=progress.quizzes?progress.best+"%":"—";
 $("statLast").textContent=progress.last===null?"—":progress.last+"%";
}

$("resetProgress").onclick=()=>{
 if(confirm("Reset saved quiz statistics on this browser?")) {
  localStorage.removeItem("tkdProgress");
  localStorage.removeItem("tkdQ");
  updateStats();
 }
};

updateStats();
