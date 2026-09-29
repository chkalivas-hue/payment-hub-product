const nav=document.querySelectorAll('.nav'),pages=document.querySelectorAll('.page');
const $=id=>document.getElementById(id);
let currentPayment=null,currentXml='';
const paymentStore=new Map();
let selectedPaymentId=null;
const demoCounters={outgoing:{total:0,processing:0,sent:0,exceptions:0},incoming:{total:0,processing:0,completed:0,exceptions:0}};
function renderCounters(){
  $('outTotal').textContent=demoCounters.outgoing.total;
  $('outProcessing').textContent=demoCounters.outgoing.processing;
  $('outSent').textContent=demoCounters.outgoing.sent;
  $('outExceptions').textContent=demoCounters.outgoing.exceptions;
  $('inTotal').textContent=demoCounters.incoming.total;
  $('inProcessing').textContent=demoCounters.incoming.processing;
  $('inCompleted').textContent=demoCounters.incoming.completed;
  $('inExceptions').textContent=demoCounters.incoming.exceptions;
}


const configs={
 correspondents:{USD:{id:'CORR-USD-01',bank:'JPMorgan Chase',bic:'CHASUS33',nostro:'USD_NOSTRO_01'},GBP:{id:'CORR-GBP-01',bank:'Demo UK Correspondent',bic:'BARCGB22',nostro:'GBP_NOSTRO_01'}},
 rules:{USD:{rail:'SWIFT',scheme:'CBPR+',profile:'CBPR_PLUS_PACS008',network:'SWIFT'},EUR:{rail:'SEPA',scheme:'SCT',profile:'SEPA_SCT_PACS008',network:'SEPA'},GBP:{rail:'SWIFT',scheme:'CBPR+',profile:'CBPR_PLUS_PACS008',network:'SWIFT'}}
};

function openPage(id){pages.forEach(p=>p.classList.toggle('active',p.id===id));nav.forEach(n=>n.classList.toggle('active',n.dataset.page===id));history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}
nav.forEach(n=>n.onclick=()=>{
 if(n.dataset.page==='payment-detail'){openPage('payments');if(selectedPaymentId)openPayment(selectedPaymentId);return;}
 openPage(n.dataset.page)
});
const hash=location.hash.slice(1);if(hash&&$(hash))openPage(hash);

function payload(){
 return {sourceSystem:$('sourceSystem').value,sourcePaymentId:$('sourcePaymentId').value,paymentType:'CREDIT_TRANSFER',direction:$('paymentDirection')?.value||'OUTGOING',
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
 return {...rule,correspondent:corr?.bic||null,correspondentBank:corr?.bank||null,nostro:corr?.nostro||null,
 routeCost:p.currency==='USD'?'10.50 USD':p.currency==='EUR'?'0.08 EUR':'7.50 GBP'};
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

async function simulateOutgoing(){
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
   p.aml={status: scenario==='aml_reject' ? 'REJECT' : 'CLEAR',provider:'AML Screening API',decisionId:'AML-'+String(Date.now()).slice(-7),latency:'184 ms'};
   p.fraud={status:'NOT_EXECUTED',provider:'Anti-Fraud API',decisionId:'-',latency:'-'};

   if(scenario==='aml_reject'){
     p.postingGate='BLOCKED'; p.status='REJECTED'; p.rejectionSource='AML'; p.rejectionReason='AML screening rejected the payment';
     setStep('compliance','error');
     throwScenarioRejection(p,'AML');
     return;
   }

   await wait(250);
   p.fraud={status: scenario==='fraud_reject' ? 'DECLINE' : 'APPROVE',provider:'Anti-Fraud API',decisionId:'FRD-'+String(Date.now()).slice(-7),latency:'126 ms'};
   if(scenario==='fraud_reject'){
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

   setStep('generated','active'); await wait(400); currentXml=makeXml(p); p.xml=currentXml;
   p.messages=[{direction:'OUT',type:'pacs.008',id:p.messageId,network:p.route.network,status:'SENT'}];
   p.events=['Payment Received','Canonical Payment Created','Validation Successful',`AML Screening: ${p.aml.status}`,`Anti-Fraud: ${p.fraud.status}`,`Posting Gate: ${p.postingGate}`,`Route Selected: ${p.route.rail} / ${p.route.scheme}`,'Core Debit / Posting Confirmed','Payment Message Generated',`Sent to ${p.route.network}`];
   p.coreEvents=['✓ Posting request prepared','✓ Account / balance / limits validated','✓ Core debit / posting: POSTED'];
   setStep('generated','done');
   setStep('sent','active'); await wait(450); setStep('sent','done');
   setStep('response','active'); await wait(500);
   if(p.scenario==='correspondent_reject'){
     p.networkStatus='REJECTED'; p.status='REJECTED'; p.rejectionSource='CORRESPONDENT / NETWORK';
     p.rejectionReason='pacs.002 RJCT — payment rejected by correspondent/network';
     p.coreStatus='REVERSAL_REQUIRED';
     p.responseMessage={type:'pacs.002',status:'RJCT',reason:'AC04 / Demo rejection'};
     p.messages.push({direction:'IN',type:'pacs.002',id:'STS-'+String(Date.now()).slice(-8),network:p.route.network,status:'REJECTED'});
     p.events.push('Network Response: REJECTED','Core Reversal Required');
     setStep('response','error');
     if(typeof stats!=='undefined'){ if('outProcessing' in stats) stats.outProcessing=Math.max(0,stats.outProcessing-1); if('outRejected' in stats) stats.outRejected++; if('outExceptions' in stats) stats.outExceptions++; }
     if(typeof counters!=='undefined'){ if('outProcessing' in counters) counters.outProcessing=Math.max(0,counters.outProcessing-1); if('outRejected' in counters) counters.outRejected++; if('outExceptions' in counters) counters.outExceptions++; }
   } else {
     p.networkStatus='ACCEPTED';
     p.messages.push({direction:'IN',type:'pacs.002',id:'STS-'+String(Date.now()).slice(-8),network:p.route.network,status:'ACCEPTED'});
     p.events.push('Network Response: ACCEPTED');
     setStep('response','done');
   }

   p.status=p.networkStatus==='REJECTED'?'REJECTED':'SENT'; p.sentAt=new Date(); currentPayment=p;
   paymentStore.set(p.paymentId,p); selectedPaymentId=p.paymentId;
   demoCounters.outgoing.processing--;
   if(p.status==='REJECTED') demoCounters.outgoing.exceptions++; else demoCounters.outgoing.sent++;
   renderCounters();

   $('pipelineStatus').className='badge green';
   $('pipelineStatus').textContent=p.status;
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


function statusBadge(status){
 const cls=['SENT','COMPLETED','ACCEPTED'].includes(status)?'green':(['REJECTED','EXCEPTION'].includes(status)?'amber':'blue');
 return `<span class="badge ${cls}">${esc(status||'PROCESSING')}</span>`;
}
function populateBO(p){
 currentPayment=p; selectedPaymentId=p.paymentId; currentXml=p.xml||'';
 const dir=p.direction||'OUTGOING', route=p.route||{rail:'N/A',scheme:'N/A',network:'N/A'};
 $('detailId').textContent=p.paymentId;
 $('detailSubtitle').textContent=`${p.amount.toLocaleString(undefined,{minimumFractionDigits:2})} ${p.currency} · ${dir} CREDIT TRANSFER · ${route.rail} ${route.scheme}`;
 $('detailStatus').className='badge large '+(['REJECTED','EXCEPTION'].includes(p.status)?'amber':'green');
 $('detailStatus').textContent=p.status||'PROCESSING';
 $('paymentFacts').innerHTML=facts([['Direction',dir],['Source System',p.sourceSystem],['Source Payment ID',p.sourcePaymentId],['Amount',`${p.amount.toFixed(2)} ${p.currency}`],['Charge Bearer',p.chargeBearer],['Priority',p.priority],['Rail',route.rail]]);
 $('partyFacts').innerHTML=facts([['Debtor',p.debtor?.name],['Debtor Account',p.debtor?.account],['Creditor',p.creditor?.name],['Creditor Account',p.creditor?.account],['Creditor Agent',p.creditor?.agentBic],['Remittance',p.remittanceInformation]]);
 $('complianceFacts').innerHTML=facts([['AML Decision',p.aml?.status],['AML Provider',p.aml?.provider],['AML Decision ID',p.aml?.decisionId],['Anti-Fraud Decision',p.fraud?.status],['Anti-Fraud Provider',p.fraud?.provider],['Fraud Decision ID',p.fraud?.decisionId],['Posting Gate',p.postingGate],['Rejection Source',p.rejectionSource||'-'],['Rejection Reason',p.rejectionReason||'-']]);
 $('routingFacts').innerHTML=dir==='OUTGOING'?facts([['Rail',route.rail],['Scheme',route.scheme],['Correspondent',route.correspondent?`${route.correspondentBank||''} (${route.correspondent})`:'Direct'],['Nostro',route.nostro||'N/A'],['Message Profile',route.profile||'-'],['Estimated Route Cost',route.routeCost||'-']]):facts([['Inbound Rail',route.rail],['Scheme',route.scheme],['Network',route.network],['Processing', 'Incoming payment — no outbound routing decision required']]);
 const events=p.events||[];
 $('lifecycle').innerHTML=events.length?events.map(x=>`<span>✓ ${esc(x)}</span>`).join(''):'<span>No lifecycle events.</span>';
 $('coreInteractions').innerHTML=(p.coreEvents||[]).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>No core interactions.</span>';
 $('auditTrail').innerHTML=events.map((x,i)=>`<span>${new Date(new Date(p.createdAt).getTime()+i*500).toLocaleTimeString()} · ${esc(x)}</span>`).join('');
 const msgs=p.messages||[];
 $('messageTable').innerHTML=msgs.length?msgs.map(m=>`<tr><td>${m.direction}</td><td><b>${m.type}</b></td><td>${esc(m.id)}</td><td>${esc(m.network)}</td><td>${statusBadge(m.status)}</td></tr>`).join(''):'<tr><td colspan="5">No messages generated.</td></tr>';
 $('viewXmlBtn').disabled=!p.xml;
}
function facts(items){return items.map(([a,b])=>`<div class="fact"><small>${a}</small><b>${esc(b??'—')}</b></div>`).join('')}
function addPaymentRow(p){
 const empty=$('emptyPaymentsRow'); if(empty)empty.remove();
 const agent=p.direction==='INCOMING'?(p.debtor?.agentBic||p.creditor?.agentBic||'—'):(p.creditor?.agentBic||'—');
 $('paymentsTable').insertAdjacentHTML('afterbegin',`<tr data-payment-id="${p.paymentId}"><td><b>${p.paymentId}</b></td><td>${esc(p.sourcePaymentId)}</td><td>${p.direction}</td><td>${p.amount.toFixed(2)} ${p.currency}</td><td>${p.route?.rail||'—'}</td><td>${esc(agent)}</td><td>${statusBadge(p.status)}</td><td><button class="link-btn" onclick="openPayment('${p.paymentId}')">Open</button></td></tr>`);
}
window.openPayment=id=>{
 const p=paymentStore.get(id); if(!p)return;
 populateBO(p);
 document.querySelectorAll('.payments-subtab').forEach(x=>x.classList.toggle('active',x.dataset.paytab==='paymentDetailsPane'));
 document.querySelectorAll('.payments-pane').forEach(x=>x.classList.toggle('active',x.id==='paymentDetailsPane'));
 openPage('payments');
};
window.openCurrentPayment=()=>selectedPaymentId&&openPayment(selectedPaymentId);
window.showExamplePayment=()=>selectedPaymentId&&openPayment(selectedPaymentId);

function incomingPayload(){
 const p=payload(); p.direction='INCOMING'; p.sourceSystem='PAYMENT_NETWORK';
 // Reuse form parties as network-provided payment data.
 return p;
}
async function simulateIncoming(){
 resetSteps(); const btn=$('sendBtn'); btn.disabled=true;
 $('pipelineStatus').className='badge blue'; $('pipelineStatus').textContent='PROCESSING';
 demoCounters.incoming.total++; demoCounters.incoming.processing++; renderCounters();
 try{
  let p=incomingPayload(); p.paymentId='PAY-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String(Date.now()).slice(-6); p.createdAt=new Date();
  p.scenario=$('scenario')?.value||'success';
  p.route=routePayment(p); p.route.routeCost='N/A';
  for(const s of ['received','canonical','validated']){setStep(s,'active');await wait(250);setStep(s,'done')}
  setStep('compliance','active');await wait(300);
  p.aml={status:p.scenario==='aml_reject'?'REJECT':'CLEAR',provider:'AML Screening API',decisionId:'AML-'+String(Date.now()).slice(-7),latency:'171 ms'};
  p.fraud={status:p.scenario==='fraud_reject'?'DECLINE':'APPROVE',provider:'Anti-Fraud API',decisionId:'FRD-'+String(Date.now()).slice(-7),latency:'119 ms'};
  if(p.aml.status==='REJECT'||p.fraud.status==='DECLINE'){
    p.postingGate='BLOCKED';p.status='REJECTED';p.rejectionSource=p.aml.status==='REJECT'?'AML':'ANTI_FRAUD';p.rejectionReason='Incoming payment blocked before beneficiary credit';setStep('compliance','error');
  }else{
    p.postingGate='CLEARED';setStep('compliance','done');
    setStep('routed','active');await wait(220);setStep('routed','done');
    setStep('generated','active');await wait(220);setStep('generated','done');
    setStep('sent','active');await wait(220);setStep('sent','done');
    setStep('response','active');await wait(220);setStep('response','done');
    p.status='COMPLETED'; p.networkStatus='RECEIVED'; p.coreStatus='POSTED';
  }
  p.messageId='MSG-IN-'+String(Date.now()).slice(-8);
  p.xml=`<Document><IncomingPayment><PaymentId>${p.paymentId}</PaymentId><Amount Ccy="${p.currency}">${p.amount.toFixed(2)}</Amount><Source>Payment Network</Source></IncomingPayment></Document>`;
  p.messages=[{direction:'IN',type:'pacs.008',id:p.messageId,network:p.route.network,status:'RECEIVED'}];
  if(p.status==='COMPLETED')p.messages.push({direction:'OUT',type:'pacs.002',id:'STS-'+String(Date.now()).slice(-8),network:p.route.network,status:'SENT'});
  p.events=['Network Message Received','ISO Message Parsed','Canonical Payment Created','Business Validation Successful',`AML: ${p.aml.status}`,`Anti-Fraud: ${p.fraud.status}`,`Posting Gate: ${p.postingGate}`];
  p.coreEvents=[];
  if(p.status==='COMPLETED'){p.events.push('Beneficiary Credit Posted','Payment Completed');p.coreEvents=['✓ Beneficiary/account validated','✓ Credit posting requested','✓ Core posting: POSTED'];}
  else {p.events.push('Payment Rejected Before Core Posting');p.coreEvents=['— No posting requested: pre-posting gate blocked'];}
  paymentStore.set(p.paymentId,p); selectedPaymentId=p.paymentId; currentPayment=p; currentXml=p.xml;
  demoCounters.incoming.processing=Math.max(0,demoCounters.incoming.processing-1);
  if(p.status==='COMPLETED')demoCounters.incoming.completed++; else demoCounters.incoming.exceptions++;
  renderCounters(); addPaymentRow(p); populateBO(p);
  $('pipelineStatus').className='badge '+(p.status==='COMPLETED'?'green':'amber');$('pipelineStatus').textContent=p.status;
  $('decisionBox').innerHTML=p.status==='COMPLETED'?'<b>Incoming Processing</b><br>Network payment received, controls cleared and beneficiary credit posted.':'<b>Incoming Exception</b><br>'+esc(p.rejectionReason);
  $('decisionBox').classList.remove('hidden');
 }finally{btn.disabled=false}
}
async function simulate(){return ($('paymentDirection')?.value||'OUTGOING')==='INCOMING'?simulateIncoming():simulateOutgoing()}

document.querySelectorAll('.direction-btn').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.direction-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
 $('paymentDirection').value=btn.dataset.direction;
 $('requestTitle').textContent=btn.dataset.direction==='INCOMING'?'Payment Network Message / Payment Data':'Core / Channel Request';
 updatePreview(); resetSteps();
}));
document.querySelectorAll('.payments-subtab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.payments-subtab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
 document.querySelectorAll('.payments-pane').forEach(x=>x.classList.toggle('active',x.id===btn.dataset.paytab));
}));
$('sendBtn').addEventListener('click',simulate);$('resetBtn').addEventListener('click',resetSteps);renderCounters();
$('viewXmlBtn').onclick=()=>{$('xmlPreview').textContent=currentXml;$('xmlModal').classList.remove('hidden')};
$('closeModal').onclick=()=> $('xmlModal').classList.add('hidden');
$('xmlModal').onclick=e=>{if(e.target.id==='xmlModal')$('xmlModal').classList.add('hidden')};

document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(t.dataset.tab).classList.add('active')});
document.querySelectorAll('.bp-tab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.bp-tab').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('.bp-flow').forEach(x=>x.classList.remove('active'));
 btn.classList.add('active');
 const target=document.getElementById(btn.dataset.bp);
 if(target) target.classList.add('active');
}));
