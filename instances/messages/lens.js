/* "Where to Message" — instance #3 of the Open Values Standard, and a second falsification test of the SHELL
   (not just the engine): this file + a skin, on the unmodified app/engine.js AND app/shell.js, with ZERO shell edits.
   A different domain (messengers), a different value vocabulary, a different skin — same living, ranked, verdict atlas.
   Facts are well-known public characteristics as of 2026; scores are illustrative, not endorsements or audits. */
window.OVS_LENS = {
  meta: {
    id: 'messages', storeKey: 'ovs-messages.values', noun: 'messaging',
    title: 'Where to Message',
    tagline: 'Pick a messenger by your own values — privacy, openness, reach. Not by who advertises hardest.',
    attribution: 'Characteristics are well-known public facts (E2EE defaults, ownership, licensing) as of 2026. Scores illustrative, not an audit.',
    footer: 'a third instance — built only from a lens + a skin, no engine or shell edits. A privacy-first user and a reach-first user get different #1s from the same core. <a href="../../app/index.html">Conscious Consuming</a> · <a href="../../kosplora/index.html">Kosplora</a>'
  },
  // The sourced axes. security/openness are near-factual (E2EE default; licence) → "measured"; the rest are judgements.
  criteria: [
    {key:'privacy',  label:'Data privacy',  tier:'assessed'},
    {key:'security', label:'Encryption',    tier:'measured'},
    {key:'openness', label:'Open & audit',  tier:'measured'},
    {key:'ease',     label:'Easy to use',   tier:'assessed'},
    {key:'reach',    label:'Who you reach', tier:'assessed'}
  ],
  // The value vocabulary a person weights once (0–5). These DERIVE the per-criterion weights via key2theme.
  themes: [
    {id:'private', label:'Private by default', blurb:'minimal data, strong encryption'},
    {id:'open',    label:'Open & auditable',   blurb:'open source, open protocol'},
    {id:'ease',    label:'Easy & everywhere',  blurb:'simple, cross-platform'},
    {id:'reach',   label:'People you reach',   blurb:'who you can actually message'}
  ],
  key2theme: { privacy:'private', security:'private', openness:'open', ease:'ease', reach:'reach' },
  // The passport bridge: a visitor's universal values → this instance's themes (autonomy/privacy travel; openness travels; the rest stay home).
  universalToLocal: { autonomy:'private', openness:'open', access:'ease', community:'reach', wellbeing:'private' },
  resources: [
    {code:'signal', name:'Signal', brand:'nonprofit messenger',
     scores:{privacy:98,security:97,openness:95,ease:84,reach:60},
     provenance:{privacy:'Nonprofit; collects almost no metadata',security:'End-to-end encrypted by default (Signal Protocol)',openness:'Fully open source, open protocol',ease:'Clean apps on every platform',reach:'Growing, but not universal'}},
    {code:'whatsapp', name:'WhatsApp', brand:'Meta',
     scores:{privacy:52,security:88,openness:28,ease:95,reach:98},
     provenance:{privacy:'Meta-owned; collects metadata',security:'E2EE by default (Signal Protocol)',openness:'Closed source, proprietary',ease:'Extremely easy, near-frictionless',reach:'Near-universal in much of the world'}},
    {code:'imessage', name:'iMessage', brand:'Apple',
     scores:{privacy:70,security:86,openness:18,ease:90,reach:80},
     provenance:{privacy:'Apple; less ad-driven, some metadata',security:'E2EE between Apple users',openness:'Closed, Apple-only',ease:'Seamless on Apple devices',reach:'Huge on iPhone; no Android'}},
    {code:'telegram', name:'Telegram', brand:'cloud messenger',
     scores:{privacy:48,security:42,openness:55,ease:90,reach:78},
     provenance:{privacy:'Cloud chats stored on its servers by default',security:'NOT E2EE by default — only opt-in "secret chats"',openness:'Clients open; server closed',ease:'Polished and feature-rich',reach:'Very large, especially groups & channels'}},
    {code:'matrix', name:'Matrix / Element', brand:'open federated protocol',
     scores:{privacy:88,security:88,openness:97,ease:60,reach:40},
     provenance:{privacy:'Self-hostable — you can own the server',security:'E2EE supported',openness:'Open protocol, federated, open clients',ease:'More setup; steadily improving',reach:'Niche, but interoperable across servers'}},
    {code:'messenger', name:'Facebook Messenger', brand:'Meta',
     scores:{privacy:34,security:48,openness:22,ease:92,reach:95},
     provenance:{privacy:'Meta-owned; ad-targeted',security:'E2EE now default, but arrived late',openness:'Closed source',ease:'Easy, tied to Facebook',reach:'Massive via Facebook accounts'}},
    {code:'threema', name:'Threema', brand:'Swiss, paid',
     scores:{privacy:95,security:92,openness:70,ease:76,reach:32},
     provenance:{privacy:'Swiss; usable with no phone number',security:'E2EE by default',openness:'Apps open-sourced; one-time paid',ease:'Solid; small purchase to start',reach:'Small user base'}}
  ]
};
