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
 correspondents:{USD:{id:'CORR-USD-01',bank:'JPMorgan Chase',bic:'CHASUS33',nostro:'USD_NOSTRO_01'},GBP:{id:'CORR-GBP-01',bank:'Demo UK Correspondent',bic:'BARCGB22',nostro:'GBP_NOSTRO_01'}},
 nostros:{USD:{id:'USD_NOSTRO_01',account:'••••••4521'},GBP:{id:'GBP_NOSTRO_01',account:'••••••8834'}},
 rules:{USD:{rail:'SWIFT',scheme:'CBPR+',profile:'CBPR_PLUS_PACS008',network:'SWIFT'},EUR:{rail:'SEPA',scheme:'SCT',profile:'SEPA_SCT_PACS008',network:'SEPA'},GBP:{rail:'SWIFT',scheme:'CBPR+',profile:'CBPR_PLUS_PACS008',network:'SWIFT'}},
 costs:{USD:'10.50 USD',EUR:'0.08 EUR',GBP:'7.50 GBP'},
 compliance:{aml:{enabled:true,timeout:3000,allow:'CLEAR',reject:'REJECT'},fraud:{enabled:true,timeout:2000,allow:'APPROVE',reject:'DECLINE'}}
};
let configs=JSON.parse(localStorage.getItem('paymentHubConfig')||'null')||structuredClone(defaultConfigs);
function syncConfigForm(){
 const v=(id,val)=>{if($(id))$(id).value=val};
 v('cfgUsdBank',configs.correspondents.USD.bank);v('cfgUsdBic',configs.correspondents.USD.bic);v('cfgUsdNostro',configs.correspondents.USD.nostro);
 v('cfgGbpBank',configs.correspondents.GBP.bank);v('cfgGbpBic',configs.correspondents.GBP.bic);v('cfgGbpNostro',configs.correspondents.GBP.nostro);
 v('cfgUsdNostro2',configs.nostros.USD.id);v('cfgUsdAccount',configs.nostros.USD.account);v('cfgGbpNostro2',configs.nostros.GBP.id);v('cfgGbpAccount',configs.nostros.GBP.account);
 for(const c of ['USD','EUR','GBP']){v('cfg'+c[0]+c.slice(1).toLowerCase()+'Rail',configs.rules[c].rail);v('cfg'+c[0]+c.slice(1).toLowerCase()+'Scheme',configs.rules[c].scheme);v('cfg'+c[0]+c.slice(1).toLowerCase()+'Network',configs.rules[c].network);v('cfg'+c[0]+c.slice(1).toLowerCase()+'Profile',configs.rules[c].profile);v('cfg'+c[0]+c.slice(1).toLowerCase()+'Cost',configs.costs[c]);}
 v('cfgAmlEnabled',String(configs.compliance.aml.enabled));v('cfgAmlTimeout',configs.compliance.aml.timeout);v('cfgAmlAllow',configs.compliance.aml.allow);v('cfgAmlReject',configs.compliance.aml.reject);
 v('cfgFraudEnabled',String(configs.compliance.fraud.enabled));v('cfgFraudTimeout',configs.compliance.fraud.timeout);v('cfgFraudAllow',configs.compliance.fraud.allow);v('cfgFraudReject',configs.compliance.fraud.reject);
}
function saveConfig(){
 const val=(id,fallback)=>$(id)?$(id).value:fallback;
 configs.correspondents.USD={...configs.correspondents.USD,bank:val('cfgUsdBank',configs.correspondents.USD.bank),bic:val('cfgUsdBic',configs.correspondents.USD.bic),nostro:val('cfgUsdNostro2',val('cfgUsdNostro',configs.correspondents.USD.nostro))};
 configs.correspondents.GBP={...configs.correspondents.GBP,bank:val('cfgGbpBank',configs.correspondents.GBP.bank),bic:val('cfgGbpBic',configs.correspondents.GBP.bic),nostro:val('cfgGbpNostro2',val('cfgGbpNostro',configs.correspondents.GBP.nostro))};
 configs.nostros.USD={id:val('cfgUsdNostro2',configs.nostros.USD.id),account:val('cfgUsdAccount',configs.nostros.USD.account)};configs.nostros.GBP={id:val('cfgGbpNostro2',configs.nostros.GBP.id),account:val('cfgGbpAccount',configs.nostros.GBP.account)};
 const ids={USD:'Usd',EUR:'Eur',GBP:'Gbp'};for(const c of Object.keys(ids)){const x=ids[c];configs.rules[c]={rail:val('cfg'+x+'Rail',configs.rules[c].rail),scheme:val('cfg'+x+'Scheme',configs.rules[c].scheme),network:val('cfg'+x+'Network',configs.rules[c].network),profile:val('cfg'+x+'Profile',configs.rules[c].profile)};configs.costs[c]=val('cfg'+x+'Cost',configs.costs[c]);}
 configs.compliance.aml={enabled:val('cfgAmlEnabled','true')==='true',timeout:Number(val('cfgAmlTimeout',3000)),allow:val('cfgAmlAllow','CLEAR'),reject:val('cfgAmlReject','REJECT')};
 configs.compliance.fraud={enabled:val('cfgFraudEnabled','true')==='true',timeout:Number(val('cfgFraudTimeout',2000)),allow:val('cfgFraudAllow','APPROVE'),reject:val('cfgFraudReject','DECLINE')};
 localStorage.setItem('paymentHubConfig',JSON.stringify(configs));syncConfigForm();document.querySelectorAll('.configSaved').forEach(x=>x.textContent='Saved — next simulation will use this configuration.');
}
function resetConfig(){configs=structuredClone(defaultConfigs);localStorage.setItem('paymentHubConfig',JSON.stringify(configs));syncConfigForm();document.querySelectorAll('.configSaved').forEach(x=>x.textContent='Defaults restored.');}

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
 const rule=configs.rules[p.currency]||configs.rules.USD;
 const corr=configs.correspondents[p.currency];
 return {...rule,correspondent:corr?.bic||null,correspondentBank:corr?.bank||null,nostro:corr?.nostro||null,routeCost:configs.costs[p.currency]||'N/A'};
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

document.querySelectorAll('.config-save').forEach(b=>b.addEventListener('click',saveConfig));document.querySelectorAll('.config-reset').forEach(b=>b.addEventListener('click',resetConfig));syncConfigForm();
