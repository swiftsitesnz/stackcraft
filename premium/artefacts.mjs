/* Built artefacts: HTML "documents" and system diagrams rendered from dictionary strings.
   They translate with the site, stay crisp at every width and carry no client data.
   Every artefact is captioned as a sample or illustration by the caller. */
const row=(label,value,cls='')=>`<div class="art-row ${cls}"><span class="art-label">${label}</span><span class="art-value">${value}</span></div>`;
const doc=(t,title,body,cls='')=>`<div class="art-doc ${cls}" role="img" aria-label="${title}"><div class="art-doc-head"><span class="art-doc-title">${title}</span><span class="art-doc-dots" aria-hidden="true">● ● ●</span></div><div class="art-doc-body">${body}</div></div>`;

export function decisionBrief(t){return doc(t,t('briefTitle'),[
 row(t('briefQuestion'),t('briefSampleQuestion'),'art-row--strong'),
 row(t('briefOptions'),t('briefSampleOptions').split(' · ').map(o=>`<span class="art-chip">${o}</span>`).join('')),
 row(t('briefConstraints'),t('briefSampleConstraints').split(' · ').map(o=>`<span class="art-line">${o}</span>`).join('')),
 row(t('briefRecommendation'),`<span class="art-redacted" aria-hidden="true"></span><span class="art-redacted short" aria-hidden="true"></span><span class="art-note">${t('briefSampleRecommendation')}</span>`),
 row(t('briefNext'),t('briefSampleNext')),
].join(''),'art-doc--brief')}

export function discoveryAgenda(t){return doc(t,t('discoveryAgenda'),[1,2,3,4].map((n,i)=>`<div class="art-agenda-item"><span class="art-num">0${n}</span><strong>${t(['discoveryCurrent','discoveryPriorities','discoveryConstraints','discoveryEstimate'][i])}</strong><span class="art-redacted" aria-hidden="true"></span></div>`).join(''),'art-doc--agenda')}

export function workshopOutline(t){return doc(t,t('trainingOutline'),[1,2,3,4].map((n,i)=>`<div class="art-agenda-item"><span class="art-num">0${n}</span><strong>${t(['trainingOne','trainingTwo','trainingThree','trainingFour'][i])}</strong></div>`).join(''),'art-doc--agenda')}

export function responsibilityMatrix(t){const rows=[['opsUsers',1,0],['opsRequests',1,1],['opsMonitor',0,1],['opsMaintain',0,1],['opsTriage',0,1],['opsEvaluate',1,1]];return doc(t,t('opsMatrix'),`<table class="art-table"><thead><tr><th></th><th>${t('opsYou')}</th><th>${t('opsUs')}</th></tr></thead><tbody>${rows.map(([k,a,b])=>`<tr><th scope="row">${t(k)}</th><td>${a?'<span class="art-tick">●</span>':''}</td><td>${b?'<span class="art-tick">●</span>':''}</td></tr>`).join('')}</tbody></table>`,'art-doc--matrix')}

export function evaluationSheet(t){return doc(t,t('evalTitle'),`<table class="art-table"><thead><tr><th>${t('evalTask')}</th><th>${t('evalExpected')}</th><th>${t('evalResult')}</th><th>${t('evalReviewer')}</th></tr></thead><tbody>${[1,2,3].map(()=>`<tr><td>${t('evalSampleTask')}</td><td>${t('evalSampleExpected')}</td><td>${t('evalSampleResult')}</td><td>${t('evalSampleReviewer')}</td></tr>`).join('')}</tbody></table>`,'art-doc--eval')}

export function auditExcerpt(t){const items=[['auditHigh','auditFindingOne'],['auditHigh','auditFindingTwo'],['auditMedium','auditFindingThree'],['auditLow','auditFindingFour']];return doc(t,t('auditTitle'),`<div class="art-findings">${items.map(([p,f])=>`<div class="art-finding"><span class="art-badge art-badge--${p.replace('audit','').toLowerCase()}">${t(p)}</span><span>${t(f)}</span></div>`).join('')}</div>`,'art-doc--audit')}

export function monthlyReport(t){return doc(t,t('reportTitle'),`<div class="art-cols"><div><strong>${t('reportDone')}</strong>${['reportItemOne','reportItemTwo','reportItemThree'].map(k=>`<span class="art-line art-line--done">${t(k)}</span>`).join('')}</div><div><strong>${t('reportNext')}</strong>${['reportItemOne','reportItemTwo'].map(k=>`<span class="art-line">${t(k)}</span>`).join('')}</div></div>`,'art-doc--report')}

export function careLog(t){return doc(t,t('logTitle'),['logOne','logTwo','logThree','logFour','logOne','logFour'].map(k=>`<div class="art-log-row"><span class="art-redacted tiny" aria-hidden="true"></span><span>${t(k)}</span><span class="art-tick">●</span></div>`).join(''),'art-doc--log')}

/* Roles, data, integrations and the exception path for one defined workflow. */
export function rolesDiagram(t){return `<div class="art-diagram art-diagram--roles" role="img" aria-label="${t('diagramRoles')}">
<div class="art-roles"><span class="art-diagram-label">${t('diagramRoles')}</span>${['roleStaff','roleManager','roleClient'].map((k,i)=>`<div class="art-role"><strong>${t(k)}</strong><span class="art-bars"><i style="width:${[92,100,46][i]}%"></i><i style="width:${[70,88,30][i]}%"></i><i style="width:${[40,76,0][i]}%"></i></span></div>`).join('')}</div>
<div class="art-boundary"><span>${t('permissionBoundary')}</span></div>
<div class="art-core"><div class="art-data"><span class="art-diagram-label">${t('diagramData')}</span>${['dataRecords','dataDocuments','dataHistory'].map(k=>`<span class="art-node">${t(k)}</span>`).join('')}</div><div class="art-integrations"><span class="art-diagram-label">${t('diagramIntegrations')}</span>${['sysAccounting','sysCalendar','sysMessaging'].map(k=>`<span class="art-node art-node--ext">${t(k)}</span>`).join('')}</div></div>
<div class="art-lanes"><span class="art-lane art-lane--exception">${t('diagramException')}</span><span class="art-lane art-lane--audit">${t('diagramAudit')}</span></div></div>`}

/* Several workflows and systems joined through one platform, delivered in milestones. */
export function platformDiagram(t){return `<div class="art-diagram art-diagram--platform" role="img" aria-label="${t('diagramPlatform')}">
<div class="art-ring">${['sysAccounting','sysCalendar','sysMessaging','roleClient'].map(k=>`<span class="art-node art-node--ext">${t(k)}</span>`).join('')}<div class="art-hub"><strong>${t('diagramPlatform')}</strong><span>${t('dataRecords')} · ${t('diagramRoles')}</span></div></div>
<ol class="art-milestones">${['milestoneOne','milestoneTwo','milestoneThree'].map((k,i)=>`<li><span>${t('milestone')} 0${i+1}</span><strong>${t(k)}</strong></li>`).join('')}</ol></div>`}

/* Task → proposal → validation → human review → action, with the fallback made explicit. */
export function aiFlow(t){return `<div class="art-diagram art-diagram--ai" role="img" aria-label="${t('aiStepTask')} → ${t('aiStepAction')}">
<ol class="art-flow">${['aiStepTask','aiStepProposal','aiStepValidation','aiStepReview','aiStepAction'].map((k,i)=>`<li class="${i===3?'art-flow--human':''}"><span>0${i+1}</span><strong>${t(k)}</strong></li>`).join('')}</ol>
<div class="art-fallback"><span aria-hidden="true">↳</span>${t('aiStepFallback')}</div></div>`}

/* Four small artefacts that the shared process actually produces. */
export function processStrip(t){return `<div class="art-strip" role="img" aria-label="${t('processTitle')}">
<div class="art-mini"><span class="art-mini-label">${t('artefactPageMap')}</span><div class="art-tree"><i></i><div><i></i><i></i><i></i><i></i></div></div></div>
<div class="art-mini"><span class="art-mini-label">${t('artefactDirection')}</span><div class="art-swatches"><i></i><i></i><i></i><b>Aa</b></div></div>
<div class="art-mini"><span class="art-mini-label">${t('artefactReview')}</span><div class="art-checks"><span>●</span><span>●</span><span>○</span><span>○</span></div></div>
<div class="art-mini"><span class="art-mini-label">${t('artefactHandover')}</span><div class="art-lines"><i></i><i></i><i class="short"></i></div></div></div>`}
