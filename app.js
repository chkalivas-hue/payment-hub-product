const nav=document.querySelectorAll('.nav'),pages=document.querySelectorAll('.page');
const $=id=>document.getElementById(id);
let currentPayment=null,currentXml='';
const demoCounters={outgoing:{total:0,processing:0,sent:0,exceptions:0,rejected:0},incoming:{total:0,processing:0,completed:0,exceptions:0}};
function renderCounters(){
  $('outTotal').textContent=demoCounters.outgoing.total;
  $('outProcessing').textContent=demoCounters.outgoing.processing;
  $('outSent').textContent=demoCounters.outgoing.sent;
  $('outExceptions').textContent=demoCounters.outgoing.exceptions;if($('outRejected'))$('outRejected').textContent=demoCounters.outgoing.rejected;
  $('inTotal').textContent=demoCounters.incoming.total;
  $('inProcessing').textContent=demoCounters.incoming.processing;
  $('inCompleted').textContent=demoCounters.incoming.completed;
  $('inExceptions').textContent=demoCounters.incoming.exceptions;
}


const defaultConfigs={
 correspondents:[{currency:'USD',bank:'JPMorgan Chase',bic:'CHASUS33',priority:1,cost:8,status:'ACTIVE'},{currency:'GBP',bank:'Demo UK Correspondent',bic:'BARCGB22',priority:1,cost:7,status:'ACTIVE'}],
 nostros:[{id:'USD_NOSTRO_01',currency:'USD',bic:'CHASUS33',account:'••••••4521',status:'ACTIVE'},{id:'GBP_NOSTRO_01',currency:'GBP',bic:'BARCGB22',account:'••••••8834',status:'ACTIVE'}],
 rules:[{priority:10,currency:'USD',min:0,max:999999999,rail:'SWIFT',scheme:'CBPR+',network:'SWIFT',profile:'CBPR_PLUS_PACS008',status:'ACTIVE'},{priority:20,currency:'EUR',min:0,max:999999999,rail:'SEPA',scheme:'SCT',network:'SEPA',profile:'SEPA_SCT_PACS008',status:'ACTIVE'},{priority:30,currency:'GBP',min:0,max:999999999,rail:'SWIFT',scheme:'CBPR+',network:'SWIFT',profile:'CBPR_PLUS_PACS008',status:'ACTIVE'}],
 fees:[{currency:'EUR',rail:'SEPA',scheme:'SCT',min:0,max:1000000,networkCost:.08,corrCost:0,status:'ACTIVE'},{currency:'EUR',rail:'SEPA',scheme:'SCT INST',min:0,max:100000,networkCost:.20,corrCost:0,status:'ACTIVE'},{currency:'USD',rail:'SWIFT',scheme:'CBPR+',min:0,max:1000000,networkCost:2.5,corrCost:8,status:'ACTIVE'}],
 profiles:[{id:'CBPR_PLUS_PACS008',rail:'SWIFT',scheme:'CBPR+',message:'pacs.008',version:'pacs.008.001.13',status:'ACTIVE'},{id:'SEPA_SCT_PACS008',rail:'SEPA',scheme:'SCT',message:'pacs.008',version:'pacs.008.001.08',status:'ACTIVE'}],
 compliance:{aml:{enabled:true,timeout:3000,allow:'CLEAR',reject:'REJECT'},fraud:{enabled:true,timeout:2000,allow:'APPROVE',reject:'DECLINE'}}
};
const clone=o=>JSON.parse(JSON.stringify(o));let configs=clone(defaultConfigs),draft=clone(defaultConfigs);
try{let x=JSON.parse(localStorage.getItem('hubCfg07')||'null');if(x){configs=x;draft=clone(x)}}catch(e){}
const tbl=(h,r)=>`<div class="table-wrap"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r.join('')}</tbody></table></div>`;
const bd=s=>`<span class="badge ${s==='ACTIVE'?'green':'gray'}">${s}</span>`;

function updateConfigOrigin(){
 const isDefault=JSON.stringify(configs)===JSON.stringify(defaultConfigs);
 document.querySelectorAll('.cfg-origin').forEach(x=>{x.textContent=isDefault?'DEFAULT':'SAVED CONFIGURATION';x.classList.toggle('saved',!isDefault)});
}
function renderCfg(){
 updateConfigOrigin();
 $('corrList').innerHTML=tbl(['Currency','Bank','BIC','Priority','Est. Cost','Status'],draft.correspondents.map((x,i)=>`<tr data-k="corr" data-i="${i}"><td><b>${x.currency}</b></td><td>${x.bank}</td><td>${x.bic}</td><td>${x.priority}</td><td>${x.cost}</td><td>${bd(x.status)}</td></tr>`));
 $('nostroList').innerHTML=tbl(['Nostro','Currency','Correspondent','Account','Status'],draft.nostros.map((x,i)=>`<tr data-k="nostro" data-i="${i}"><td><b>${x.id}</b></td><td>${x.currency}</td><td>${x.bic}</td><td>${x.account}</td><td>${bd(x.status)}</td></tr>`));
 $('ruleList').innerHTML=tbl(['Priority','Condition','Route','Profile','Status'],draft.rules.map((x,i)=>`<tr data-k="rule" data-i="${i}"><td>${x.priority}</td><td>${x.currency} · ${x.min}–${x.max}</td><td><b>${x.rail}/${x.scheme}</b> · ${x.network}</td><td>${x.profile}</td><td>${bd(x.status)}</td></tr>`));
 $('feeList').innerHTML=tbl(['Currency','Rail / Scheme','Amount Band','Network','Correspondent','Status'],draft.fees.map((x,i)=>`<tr data-k="fee" data-i="${i}"><td>${x.currency}</td><td><b>${x.rail}/${x.scheme}</b></td><td>${x.min}–${x.max}</td><td>${x.networkCost}</td><td>${x.corrCost}</td><td>${bd(x.status)}</td></tr>`));
 $('profileList').innerHTML=tbl(['Profile','Rail / Scheme','Message','Version','Status'],draft.profiles.map((x,i)=>`<tr data-k="profile" data-i="${i}"><td><b>${x.id}</b></td><td>${x.rail}/${x.scheme}</td><td>${x.message}</td><td>${x.version}</td><td>${bd(x.status)}</td></tr>`));
 $('complianceList').innerHTML=tbl(['Control','Enabled','Timeout','Allow','Reject'],[['AML',draft.compliance.aml],['Anti-Fraud',draft.compliance.fraud]].map(([n,x])=>`<tr><td><b>${n}</b></td><td>${x.enabled?'Yes':'No'}</td><td>${x.timeout} ms</td><td>${x.allow}</td><td>${x.reject}</td></tr>`));
 bindConfigRows();
}

function bindConfigRows(){
 document.querySelectorAll('#corrList tbody tr').forEach((r,i)=>r.onclick=()=>{let x=draft.correspondents[i],e=$('correspondents').querySelector('.editor');e.classList.remove('hidden');e.dataset.i=i;$('eCorrCurrency').value=x.currency;$('eCorrBank').value=x.bank;$('eCorrBic').value=x.bic;$('eCorrPriority').value=x.priority;$('eCorrCost').value=x.cost;$('eCorrStatus').value=x.status});
 document.querySelectorAll('#nostroList tbody tr').forEach((r,i)=>r.onclick=()=>{let x=draft.nostros[i],e=$('nostros').querySelector('.editor');e.classList.remove('hidden');e.dataset.i=i;$('eNostroId').value=x.id;$('eNostroCurrency').value=x.currency;$('eNostroBic').value=x.bic;$('eNostroAccount').value=x.account;$('eNostroStatus').value=x.status});
 document.querySelectorAll('#ruleList tbody tr').forEach((r,i)=>r.onclick=()=>{let x=draft.rules[i],e=$('routing-rules').querySelector('.editor');e.classList.remove('hidden');e.dataset.i=i;$('eRulePriority').value=x.priority;$('eRuleCurrency').value=x.currency;$('eRuleMin').value=x.min;$('eRuleMax').value=x.max;$('eRuleRail').value=x.rail;$('eRuleScheme').value=x.scheme;$('eRuleNetwork').value=x.network;$('eRuleProfile').value=x.profile;$('eRuleStatus').value=x.status});
 document.querySelectorAll('#feeList tbody tr').forEach((r,i)=>r.onclick=()=>{let x=draft.fees[i],e=$('fees').querySelector('.editor');e.classList.remove('hidden');e.dataset.i=i;$('eFeeCurrency').value=x.currency;$('eFeeRail').value=x.rail;$('eFeeScheme').value=x.scheme;$('eFeeMin').value=x.min;$('eFeeMax').value=x.max;$('eFeeNetwork').value=x.networkCost;$('eFeeCorr').value=x.corrCost;$('eFeeStatus').value=x.status});
 document.querySelectorAll('#profileList tbody tr').forEach((r,i)=>r.onclick=()=>{let x=draft.profiles[i],e=$('profiles').querySelector('.editor');e.classList.remove('hidden');e.dataset.i=i;$('eProfileId').value=x.id;$('eProfileRail').value=x.rail;$('eProfileScheme').value=x.scheme;$('eProfileMessage').value=x.message;$('eProfileVersion').value=x.version;$('eProfileStatus').value=x.status});
}

function saveCfg(){draft.compliance.aml={enabled:$('eAmlEnabled').value==='true',timeout:+$('eAmlTimeout').value,allow:$('eAmlAllow').value,reject:$('eAmlReject').value};draft.compliance.fraud={enabled:$('eFraudEnabled').value==='true',timeout:+$('eFraudTimeout').value,allow:$('eFraudAllow').value,reject:$('eFraudReject').value};configs=clone(draft);localStorage.setItem('hubCfg07',JSON.stringify(configs));$('configModal').classList.add('hidden');document.querySelectorAll('.editor').forEach(x=>x.classList.add('hidden'));openPage('simulator')}


function openPage(id){pages.forEach(p=>p.classList.toggle('active',p.id===id));nav.forEach(n=>n.classList.toggle('active',n.dataset.page===id));history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}
nav.forEach(n=>n.onclick=()=>openPage(n.dataset.page));
const hash=location.hash.slice(1);if(hash&&$(hash))openPage(hash);

function payload(){
 return {sourceSystem:$('sourceSystem').value,sourcePaymentId:$('sourcePaymentId').value,paymentType:'CREDIT_TRANSFER',direction:'OUTGOING',
 debtor:{customerId:$('customerId').value,name:$('debtorName').value,account:$('debtorAccount').value},
 creditor:{name:$('creditorName').value,account:$('creditorAccount').value,agentBic:$('creditorBic').value},
 amount:Number($('amount').value),currency:$('currency').value,chargeBearer:$('charges').value,priority:$('priority').value,remittanceInformation:$('remittance').value};
}
function updatePreview(){$('requestPreview').textContent=JSON.stringify(payload(),null,2)}
document.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',updatePreview));updatePreview();

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function setStep(name,state){const e=document.querySelector(`[data-step="${name}"]`);e.classList.remove('active','done');if(state)e.classList.add(state)}
function resetSteps(){document.querySelectorAll('.step').forEach(e=>e.classList.remove('active','done'));$('decisionBox').classList.add('hidden');$('pipelineStatus').className='badge gray';$('pipelineStatus').textContent='READY'}


function throwScenarioRejection(p,source){
  if(typeof stats!=='undefined'){
    if('outProcessing' in stats) stats.outProcessing=Math.max(0,stats.outProcessing-1);
    if('outExceptions' in stats) stats.outExceptions++;
    if('outRejected' in stats) stats.outRejected++;
  }
  if(typeof counters!=='undefined'){
    if('outProcessing' in counters) counters.outProcessing=Math.max(0,counters.outProcessing-1);
    if('outExceptions' in counters) counters.outExceptions++;
    if('outRejected' in counters) counters.outRejected++;
  }
  payments.unshift(p);
  renderPayments();
  if(typeof renderCounters==='function') renderCounters();
  showPayment(p);
  const result=$('result');
  if(result) result.innerHTML=`<b>Payment REJECTED</b><br>Source: ${source}<br>${p.rejectionReason}<br><br><b>No Core posting and no network message were sent.</b>`;
}

function routePayment(p){
 const rule=configs.rules.filter(x=>x.status==='ACTIVE'&&x.currency===p.currency&&p.amount>=x.min&&p.amount<=x.max).sort((a,b)=>a.priority-b.priority)[0]||configs.rules.find(x=>x.status==='ACTIVE');
 const corr=configs.correspondents.filter(x=>x.status==='ACTIVE'&&x.currency===p.currency).sort((a,b)=>(a.priority-b.priority)||(a.cost-b.cost))[0];
 const nostro=corr?configs.nostros.find(x=>x.status==='ACTIVE'&&x.currency===p.currency&&x.bic===corr.bic):null;
 const fee=configs.fees.find(x=>x.status==='ACTIVE'&&x.currency===p.currency&&x.rail===rule.rail&&x.scheme===rule.scheme&&p.amount>=x.min&&p.amount<=x.max);
 const cost=fee?(+fee.networkCost + +fee.corrCost):+(corr?.cost||0);
 return {...rule,correspondent:corr?.bic||null,correspondentBank:corr?.bank||null,nostro:nostro?.id||null,routeCost:`${cost.toFixed(2)} ${p.currency}`};
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function makeXml(p){
 const msgId='MSG-'+Date.now();
 const uuidFallback=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16)});
 const uetr=(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():uuidFallback();
 p.messageId=msgId;p.uetr=uetr;
 return `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${esc(p.sourcePaymentId)}</InstrId>
        <EndToEndId>${esc(p.sourcePaymentId)}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${esc(p.currency)}">${p.amount.toFixed(2)}</IntrBkSttlmAmt>
      <ChrgBr>${esc(p.chargeBearer)}</ChrgBr>
      <Dbtr><Nm>${esc(p.debtor.name)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${esc(p.debtor.account)}</IBAN></Id></DbtrAcct>
      <IntrmyAgt1><FinInstnId><BICFI>${esc(p.route.correspondent||'N/A')}</BICFI></FinInstnId></IntrmyAgt1>
      <CdtrAgt><FinInstnId><BICFI>${esc(p.creditor.agentBic)}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${esc(p.creditor.name)}</Nm></Cdtr>
      <CdtrAcct><Id><Othr><Id>${esc(p.creditor.account)}</Id></Othr></Id></CdtrAcct>
      <RmtInf><Ustrd>${esc(p.remittanceInformation)}</Ustrd></RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
}

async function simulate(){
 resetSteps();
 const btn=$('sendBtn');
 btn.disabled=true;
 $('pipelineStatus').className='badge blue';
 $('pipelineStatus').textContent='PROCESSING';

 demoCounters.outgoing.total++;
 demoCounters.outgoing.processing++;
 renderCounters();

 try{
   let p=payload();
   if(!p.amount || p.amount<=0) throw new Error('Amount must be greater than zero.');
   if(!p.debtor.account || !p.creditor.account || !p.creditor.agentBic) throw new Error('Debtor account, creditor account and creditor BIC are required.');

   p.paymentId='PAY-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String(Date.now()).slice(-6);
   p.createdAt=new Date();

   for(const s of ['received','canonical','validated']){
     setStep(s,'active'); await wait(350); setStep(s,'done');
   }

   // Scenario-driven AML / Anti-Fraud pre-posting controls.
   const scenario = $('scenario') ? $('scenario').value : 'success';
   p.scenario=scenario;
   setStep('compliance','active'); await wait(500);
   p.aml={status: !configs.compliance.aml.enabled ? 'SKIPPED' : (scenario==='aml_reject' ? configs.compliance.aml.reject : configs.compliance.aml.allow),provider:'AML Screening API',decisionId:'AML-'+String(Date.now()).slice(-7),latency:'184 ms'};
   p.fraud={status:configs.compliance.fraud.enabled?'NOT_EXECUTED':'SKIPPED',provider:'Anti-Fraud API',decisionId:'-',latency:'-'};

   if(scenario==='aml_reject' && configs.compliance.aml.enabled){
     p.postingGate='BLOCKED'; p.status='REJECTED'; p.rejectionSource='AML'; p.rejectionReason='AML screening rejected the payment';
     setStep('compliance','error');
     throwScenarioRejection(p,'AML');
     return;
   }

   await wait(250);
   p.fraud={status: !configs.compliance.fraud.enabled ? 'SKIPPED' : (scenario==='fraud_reject' ? configs.compliance.fraud.reject : configs.compliance.fraud.allow),provider:'Anti-Fraud API',decisionId:'FRD-'+String(Date.now()).slice(-7),latency:'126 ms'};
   if(scenario==='fraud_reject' && configs.compliance.fraud.enabled){
     p.postingGate='BLOCKED'; p.status='REJECTED'; p.rejectionSource='ANTI_FRAUD'; p.rejectionReason='Anti-Fraud engine declined the payment';
     setStep('compliance','error');
     throwScenarioRejection(p,'ANTI_FRAUD');
     return;
   }

   p.postingGate='CLEARED';
   setStep('compliance','done');

   p.route=routePayment(p);
   setStep('routed','active'); await wait(400); setStep('routed','done');
   $('decisionBox').innerHTML=`<b>Pre-Posting Gate: CLEARED</b> · AML: CLEAR · Anti-Fraud: APPROVE<br><br><b>Routing Decision</b><br>Rail: <b>${p.route.rail}</b> · Scheme: <b>${p.route.scheme}</b> · Correspondent: <b>${p.route.correspondent||'Direct'}</b> · Nostro: <b>${p.route.nostro||'N/A'}</b> · Profile: <b>${p.route.profile}</b> · Estimated route cost: <b>${p.route.routeCost}</b>`;
   $('decisionBox').classList.remove('hidden');

   setStep('generated','active'); await wait(400); currentXml=makeXml(p); setStep('generated','done');
   setStep('sent','active'); await wait(450); setStep('sent','done');
   setStep('response','active'); await wait(500);
   if(p.scenario==='correspondent_reject'){
     p.networkStatus='REJECTED'; p.status='REJECTED'; p.rejectionSource='CORRESPONDENT / NETWORK';
     p.rejectionReason='pacs.002 RJCT — payment rejected by correspondent/network';
     p.coreStatus='REVERSAL_REQUIRED';demoCounters.outgoing.rejected++;demoCounters.outgoing.exceptions++;
     p.responseMessage={type:'pacs.002',status:'RJCT',reason:'AC04 / Demo rejection'};
     setStep('response','error');
     if(typeof stats!=='undefined'){ if('outProcessing' in stats) stats.outProcessing=Math.max(0,stats.outProcessing-1); if('outRejected' in stats) stats.outRejected++; if('outExceptions' in stats) stats.outExceptions++; }
     if(typeof counters!=='undefined'){ if('outProcessing' in counters) counters.outProcessing=Math.max(0,counters.outProcessing-1); if('outRejected' in counters) counters.outRejected++; if('outExceptions' in counters) counters.outExceptions++; }
   } else {
     p.networkStatus='ACCEPTED'; setStep('response','done');
   }

   p.sentAt=new Date(); if(p.scenario!=='correspondent_reject') p.status='SENT'; currentPayment=p;
   demoCounters.outgoing.processing--;
   demoCounters.outgoing.sent++;
   renderCounters();

   $('pipelineStatus').className=p.status==='REJECTED'?'badge amber':'badge green';
   $('pipelineStatus').textContent=p.status==='REJECTED'?'REJECTED':'SENT';
   populateBO(p);
   addPaymentRow(p);
 }catch(err){
   demoCounters.outgoing.processing=Math.max(0,demoCounters.outgoing.processing-1);
   demoCounters.outgoing.exceptions++;
   renderCounters();
   $('pipelineStatus').className='badge amber';
   $('pipelineStatus').textContent='EXCEPTION';
   $('decisionBox').innerHTML=`<b>Processing Exception</b><br>${esc(err.message||'Unexpected demo error')}`;
   $('decisionBox').classList.remove('hidden');
   console.error(err);
 }finally{
   btn.disabled=false;
 }
}

function populateBO(p){
 $('detailId').textContent=p.paymentId;$('detailSubtitle').textContent=`${p.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ${p.currency} · OUTGOING CREDIT TRANSFER · ${p.route.rail} ${p.route.scheme}`;
 $('detailStatus').className=p.status==='REJECTED'?'badge amber large':'badge green large';$('detailStatus').textContent=p.status;
 $('paymentFacts').innerHTML=facts([['Source System',p.sourceSystem],['Source Payment ID',p.sourcePaymentId],['Amount',`${p.amount.toFixed(2)} ${p.currency}`],['Charge Bearer',p.chargeBearer],['Priority',p.priority],['Rail',p.route.rail],['Payment Status',p.status],['Network Status',p.networkStatus||'SENT'],['Rejection Source',p.rejectionSource||'-'],['Rejection Reason',p.rejectionReason||'-']]);
 $('partyFacts').innerHTML=facts([['Debtor',p.debtor.name],['Debtor Account',p.debtor.account],['Creditor',p.creditor.name],['Creditor Account',p.creditor.account],['Creditor Agent',p.creditor.agentBic],['Remittance',p.remittanceInformation]]);
 $('complianceFacts').innerHTML=facts([['AML Decision',p.aml.status],['AML Provider',p.aml.provider],['AML Decision ID',p.aml.decisionId],['AML Latency',p.aml.latency],['Anti-Fraud Decision',p.fraud.status],['Anti-Fraud Provider',p.fraud.provider],['Fraud Decision ID',p.fraud.decisionId],['Fraud Latency',p.fraud.latency],['Posting Gate',p.postingGate],['Rejection Source',p.rejectionSource||'-'],['Rejection Reason',p.rejectionReason||'-']]);
 $('routingFacts').innerHTML=facts([['Rail',p.route.rail],['Scheme',p.route.scheme],['Correspondent',p.route.correspondent?`${p.route.correspondentBank} (${p.route.correspondent})`:'Direct'],['Nostro',p.route.nostro||'N/A'],['Message Profile',p.route.profile],['Estimated Route Cost',p.route.routeCost]]);
 const events=['Payment Received','Canonical Payment Created','Validation Successful',`AML Screening: ${p.aml?.status||'-'}`,`Anti-Fraud: ${p.fraud?.status||'-'}`,`Posting Gate: ${p.postingGate||'-'}`,`Route Selected: ${p.route.rail} / ${p.route.scheme}`,'Payment Message Generated',`Sent to ${p.route.network}`,p.status==='REJECTED'?`Network Response: REJECTED — ${p.rejectionReason}`:'Network Response: ACCEPTED'];
 $('lifecycle').innerHTML=events.map(x=>`<span>✓ ${x}</span>`).join('');
 $('coreInteractions').innerHTML=['✓ CreatePayment request received','✓ Debtor/account data accepted',`✓ AML screening: ${p.aml.status}`,`✓ Anti-Fraud: ${p.fraud.status}`,`✓ Posting Gate: ${p.postingGate}`,p.coreStatus==='REVERSAL_REQUIRED'?'⚠ Core reversal required':'✓ Core posting eligible','✓ Payment reference correlated: '+p.sourcePaymentId].map(x=>`<span>${x}</span>`).join('');
 $('auditTrail').innerHTML=events.map((x,i)=>`<span>${new Date(p.createdAt.getTime()+i*500).toLocaleTimeString()} · ${x}</span>`).join('');
 $('messageTable').innerHTML=`<tr><td>OUT</td><td><b>pacs.008</b></td><td>${p.messageId}</td><td>${p.route.network}</td><td><span class="badge green">SENT</span></td></tr>`+(p.status==='REJECTED'?`<tr><td>IN</td><td><b>pacs.002</b></td><td>RESP-${p.messageId}</td><td>${p.route.network}</td><td><span class="badge amber">RJCT</span></td></tr>`:'');
 $('viewXmlBtn').disabled=false;
}
function facts(items){return items.map(([a,b])=>`<div class="fact"><small>${a}</small><b>${esc(b??'—')}</b></div>`).join('')}
function addPaymentRow(p){const empty=$('emptyPaymentsRow');if(empty)empty.remove();$('paymentsTable').insertAdjacentHTML('afterbegin',`<tr><td><b>${p.paymentId}</b></td><td>${esc(p.sourcePaymentId)}</td><td>OUTGOING</td><td>${p.amount.toFixed(2)} ${p.currency}</td><td>${p.route.rail}</td><td>${esc(p.creditor.agentBic)}</td><td><span class="badge ${p.status==='REJECTED'?'amber':'green'}">${p.status}</span></td><td><button class="link-btn" onclick="openCurrentPayment()">Open</button></td></tr>`)}
window.openCurrentPayment=()=>openPage('payment-detail');
window.showExamplePayment=()=>openPage('payment-detail');

$('sendBtn').addEventListener('click',simulate);$('resetBtn').addEventListener('click',resetSteps);renderCounters();
$('viewXmlBtn').onclick=()=>{$('xmlPreview').textContent=currentXml;$('xmlModal').classList.remove('hidden')};
$('closeModal').onclick=()=> $('xmlModal').classList.add('hidden');
$('xmlModal').onclick=e=>{if(e.target.id==='xmlModal')$('xmlModal').classList.add('hidden')};

document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(t.dataset.tab).classList.add('active')});
function ed(page){return page.querySelector('.editor')}
document.querySelectorAll('.cfg-edit').forEach(b=>b.onclick=()=>ed(b.closest('.page')).classList.toggle('hidden'));
document.querySelectorAll('.cfg-add').forEach(b=>b.onclick=()=>{let e=ed(b.closest('.page'));delete e.dataset.i;e.classList.remove('hidden')});
document.querySelectorAll('.cfg-inactive').forEach(b=>b.onclick=()=>{let id=b.closest('.page').id,map={'correspondents':'correspondents','nostros':'nostros','routing-rules':'rules','fees':'fees','profiles':'profiles'};if(map[id]){let a=draft[map[id]];let x=a.find(v=>v.status==='ACTIVE');if(x)x.status='INACTIVE'}else{draft.compliance.aml.enabled=false;draft.compliance.fraud.enabled=false}renderCfg()});
document.querySelectorAll('.cfg-save').forEach(b=>b.onclick=()=>$('configModal').classList.remove('hidden'));$('cfgCancel').addEventListener('click',e=>{e.preventDefault();$('configModal').classList.add('hidden')});$('cfgConfirm').addEventListener('click',e=>{e.preventDefault();saveCfg()});
$('applyCorr').onclick=()=>{let e=$('correspondents').querySelector('.editor'),o={currency:$('eCorrCurrency').value.toUpperCase(),bank:$('eCorrBank').value,bic:$('eCorrBic').value.toUpperCase(),priority:+$('eCorrPriority').value,cost:+$('eCorrCost').value,status:$('eCorrStatus').value};if(e.dataset.i!==undefined){draft.correspondents[+e.dataset.i]=o;delete e.dataset.i}else draft.correspondents.push(o);renderCfg()};
$('applyNostro').onclick=()=>{let e=$('nostros').querySelector('.editor'),o={id:$('eNostroId').value,currency:$('eNostroCurrency').value.toUpperCase(),bic:$('eNostroBic').value.toUpperCase(),account:$('eNostroAccount').value,status:$('eNostroStatus').value};if(e.dataset.i!==undefined){draft.nostros[+e.dataset.i]=o;delete e.dataset.i}else draft.nostros.push(o);renderCfg()};
$('applyRule').onclick=()=>{draft.rules.push({priority:+$('eRulePriority').value,currency:$('eRuleCurrency').value.toUpperCase(),min:+$('eRuleMin').value,max:+$('eRuleMax').value,rail:$('eRuleRail').value.toUpperCase(),scheme:$('eRuleScheme').value.toUpperCase(),network:$('eRuleNetwork').value.toUpperCase(),profile:$('eRuleProfile').value,status:$('eRuleStatus').value});renderCfg()};
$('applyFee').onclick=()=>{draft.fees.push({currency:$('eFeeCurrency').value.toUpperCase(),rail:$('eFeeRail').value.toUpperCase(),scheme:$('eFeeScheme').value.toUpperCase(),min:+$('eFeeMin').value,max:+$('eFeeMax').value,networkCost:+$('eFeeNetwork').value,corrCost:+$('eFeeCorr').value,status:$('eFeeStatus').value});renderCfg()};
$('applyProfile').onclick=()=>{draft.profiles.push({id:$('eProfileId').value,rail:$('eProfileRail').value.toUpperCase(),scheme:$('eProfileScheme').value.toUpperCase(),message:$('eProfileMessage').value,version:$('eProfileVersion').value,status:$('eProfileStatus').value});renderCfg()};
renderCfg();
