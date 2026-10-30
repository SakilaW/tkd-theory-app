for(const rank of ranks) {
 const option=document.createElement("option");
 option.value=rank;
 option.textContent=rank;
 $("rankFilter").appendChild(option);
}
for(const topic of topics) {
 const option=document.createElement("option");
 option.value=topic;
 option.textContent=topic;
 $("topicFilter").appendChild(option);
}

function renderBank() {
 const search=$("search").value.trim().toLocaleLowerCase();
 const rank=$("rankFilter").value,topic=$("topicFilter").value;
 const matches=all.filter(question=>{
  if(rank&&question.rank!==rank)return false;
  if(topic&&question.cat!==topic)return false;
  const content=[question.q,question.a,question.why,question.cat,question.rank,...(question.wrong||[])].join(" ").toLocaleLowerCase();
  return !search||content.includes(search);
 });
 $("bankCount").textContent=`Showing ${matches.length} of ${all.length} questions`;
 if(!matches.length) {
  $("questionList").innerHTML='<p class="bank-empty">No questions match those filters.</p>';
  return;
 }
 $("questionList").innerHTML=matches.map(question=>`<article class="bank-item">
  <span class="tag">${escapeHtml(question.cat)}</span><span class="tag">${escapeHtml(question.rank)}</span>
  <h3>${escapeHtml(question.q)}</h3>
  ${question.image?`<img class="pattern-diagram" src="${escapeHtml(question.image)}" alt="Pattern diagram for ${escapeHtml(question.pattern||question.a)}">`:""}
  <p><strong>Answer:</strong> ${escapeHtml(question.a)}</p>
  ${question.wrong?.length?`<p class="muted"><strong>Other listed answers:</strong> ${question.wrong.map(escapeHtml).join(" · ")}</p>`:""}
  ${question.why?`<p class="muted">${escapeHtml(question.why)}</p>`:""}
 </article>`).join("");
}

$("search").addEventListener("input",renderBank);
$("rankFilter").addEventListener("change",renderBank);
$("topicFilter").addEventListener("change",renderBank);
renderBank();
