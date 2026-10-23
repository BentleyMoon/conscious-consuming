/* Kosplora curriculum demonstration, research round 2026-07.
   Skin-layer content only: it does not modify the signed 18-resource decision receipt.
   The data and renderer are deliberately plain files that can be inspected, copied, and challenged. */
(function(global){
  'use strict';
  const L = global.OVS_LENS || global.KOSPLORA_LENS;
  if (!L) return;
  const DATA = {
  "version": "0.2.0",
  "status": "curated-demonstration",
  "checked": "2026-09-29",
  "title": "Study routes that end in something you made",
  "dek": "Pick a route and tick off each stage as you finish it. Your local progress is kept in this browser only.",
  "method": {
    "sequence": [
      "orient",
      "study",
      "practice",
      "make",
      "review"
    ],
    "reads": "Every route names outcomes, prerequisites, time, a final artifact, access conditions, and source-checked starting points. It is a demonstration curriculum, not accreditation or a promise that one route fits everyone.",
    "access": "Open means reuse rights are stated. Free means no-cost access today. Mixed means an account, eligibility rule, paid option, or restricted rights may matter.",
    "safety": "High-stakes health and legal routes teach evidence literacy only. They do not provide diagnosis, treatment, or legal advice."
  },
  "resources": [
    {
      "id": "openlearn-learning",
      "name": "Learning how to learn",
      "provider": "The Open University",
      "url": "https://www.open.edu/openlearn/education-development/learning-how-learn/",
      "format": "course",
      "access": "open",
      "license": "CC course materials; third-party exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A six-hour introductory course with reflection activities and downloadable text formats.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "ies-study-guide",
      "name": "Organizing Instruction and Study to Improve Student Learning",
      "provider": "What Works Clearinghouse",
      "url": "https://ies.ed.gov/ncee/wwc/PracticeGuide/1",
      "format": "practice guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Evidence-rated recommendations on spacing, worked examples, quizzing, explanatory questions, and delayed review.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "cast-udl",
      "name": "Universal Design for Learning Guidelines 3.0",
      "provider": "CAST",
      "url": "https://udlguidelines.cast.org/",
      "format": "framework",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A barrier-aware framework for offering multiple ways to engage, understand, act, and express learning.",
      "sourceClass": "nonprofit standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "learning-scientists",
      "name": "Retrieval Practice",
      "provider": "The Learning Scientists",
      "url": "https://www.learningscientists.org/retrieval-practice",
      "format": "guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Plain-language explanations and classroom materials for active recall.",
      "sourceClass": "research communication project",
      "checked": "2026-07-22"
    },
    {
      "id": "anki-manual",
      "name": "Anki Manual",
      "provider": "Anki",
      "url": "https://docs.ankiweb.net/",
      "format": "tool guide",
      "access": "open",
      "license": "Open-source software; documentation terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Documentation for building and scheduling spaced-repetition prompts; paper cards remain a valid alternative.",
      "sourceClass": "open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "zotero-quickstart",
      "name": "Zotero Quick Start Guide",
      "provider": "Zotero",
      "url": "https://www.zotero.org/support/quick_start_guide",
      "format": "tool guide",
      "access": "open",
      "license": "AGPL software; documentation terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A local-first research library for collecting, organizing, citing, and annotating sources.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "open-textbook-library",
      "name": "Open Textbook Library",
      "provider": "Open Education Network",
      "url": "https://open.umn.edu/opentextbooks",
      "format": "library",
      "access": "open",
      "license": "Open licenses vary by book",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Complete, portable, openly licensed textbooks reviewed and used through higher-education institutions.",
      "sourceClass": "university consortium",
      "checked": "2026-07-22"
    },
    {
      "id": "oer-commons",
      "name": "OER Commons",
      "provider": "ISKME",
      "url": "https://www.oercommons.org/",
      "format": "repository",
      "access": "open",
      "license": "Open licenses vary by item",
      "account": "optional",
      "bandwidth": "low",
      "download": false,
      "note": "A large repository for finding, adapting, and sharing open educational resources.",
      "sourceClass": "nonprofit repository",
      "checked": "2026-07-22"
    },
    {
      "id": "libretexts",
      "name": "LibreTexts",
      "provider": "LibreTexts",
      "url": "https://libretexts.org/",
      "format": "library",
      "access": "open",
      "license": "Open licenses vary by library",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A nonprofit platform of subject libraries, open texts, and adaptable course materials.",
      "sourceClass": "nonprofit repository",
      "checked": "2026-07-22"
    },
    {
      "id": "mit-ocw",
      "name": "MIT OpenCourseWare",
      "provider": "MIT",
      "url": "https://ocw.mit.edu/",
      "format": "courseware",
      "access": "open",
      "license": "CC BY-NC-SA",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Course materials from thousands of MIT courses, with no enrollment and many downloadable packages.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openlearn",
      "name": "OpenLearn",
      "provider": "The Open University",
      "url": "https://www.open.edu/openlearn/free-courses/full-catalogue",
      "format": "course library",
      "access": "open",
      "license": "Mostly CC BY-NC-SA; item exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Hundreds of free courses across broad subject areas; accounts are optional for tracking and statements.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openintro-stats",
      "name": "OpenIntro Statistics",
      "provider": "OpenIntro",
      "url": "https://www.openintro.org/book/os/",
      "format": "textbook",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A free statistics textbook with exercises, labs, data, and an accessible screen-reader PDF.",
      "sourceClass": "nonprofit open textbook project",
      "checked": "2026-07-22"
    },
    {
      "id": "seeing-theory",
      "name": "Seeing Theory",
      "provider": "Brown University",
      "url": "https://seeing-theory.brown.edu/",
      "format": "interactive",
      "access": "open",
      "license": "Open-source project; site terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Interactive visual explanations of probability and statistics.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "our-world-in-data",
      "name": "Our World in Data",
      "provider": "Global Change Data Lab",
      "url": "https://ourworldindata.org/",
      "format": "data and articles",
      "access": "open",
      "license": "CC BY for original work; source-data terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Charts, data, and research across global problems, with source notes and downloadable datasets.",
      "sourceClass": "nonprofit research project",
      "checked": "2026-07-22"
    },
    {
      "id": "fred",
      "name": "FRED",
      "provider": "Federal Reserve Bank of St. Louis",
      "url": "https://fred.stlouisfed.org/",
      "format": "data portal",
      "access": "free",
      "license": "Public data; source terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A large economic time-series database with graphs, downloads, and source metadata.",
      "sourceClass": "public institution",
      "checked": "2026-07-22"
    },
    {
      "id": "data-gov",
      "name": "Data.gov",
      "provider": "US General Services Administration",
      "url": "https://data.gov/",
      "format": "data catalog",
      "access": "free",
      "license": "US government data; dataset terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The US government data catalog, useful for finding primary public datasets.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "world-bank-data",
      "name": "World Bank Open Data",
      "provider": "World Bank",
      "url": "https://data.worldbank.org/",
      "format": "data portal",
      "access": "open",
      "license": "CC BY 4.0 for many datasets; check item terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Global development indicators with downloadable tables and country profiles.",
      "sourceClass": "international public institution",
      "checked": "2026-07-22"
    },
    {
      "id": "r4ds",
      "name": "R for Data Science",
      "provider": "Hadley Wickham, Mine Cetinkaya-Rundel, Garrett Grolemund",
      "url": "https://r4ds.hadley.nz/",
      "format": "open book",
      "access": "open",
      "license": "CC BY-NC-ND",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A complete online introduction to reproducible data work in R.",
      "sourceClass": "open book",
      "checked": "2026-07-22"
    },
    {
      "id": "calling-bullshit",
      "name": "Calling Bullshit",
      "provider": "University of Washington",
      "url": "https://www.callingbullshit.org/",
      "format": "course",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A course on spotting misleading uses of data, models, visualization, and quantitative language.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "desmos",
      "name": "Desmos Graphing Calculator",
      "provider": "Desmos Studio",
      "url": "https://www.desmos.com/calculator",
      "format": "interactive tool",
      "access": "free",
      "license": "Free to use; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "A fast graphing environment for exploring equations and checking visual claims.",
      "sourceClass": "public-benefit education company",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-writing",
      "name": "Writing Guide with Handbook",
      "provider": "OpenStax",
      "url": "https://openstax.org/details/books/writing-guide",
      "format": "textbook",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed college writing guide with genres, research, citation, grammar, and revision.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "purdue-owl",
      "name": "Purdue Online Writing Lab",
      "provider": "Purdue University",
      "url": "https://owl.purdue.edu/",
      "format": "reference",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Writing, research, grammar, citation, and professional communication guidance.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "writing-commons",
      "name": "Writing Commons",
      "provider": "Writing Commons",
      "url": "https://writingcommons.org/",
      "format": "reference",
      "access": "open",
      "license": "CC BY-NC-ND unless noted",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed encyclopedia for writing, research, rhetoric, and information literacy.",
      "sourceClass": "peer-reviewed open project",
      "checked": "2026-07-22"
    },
    {
      "id": "unc-writing-center",
      "name": "Tips and Tools",
      "provider": "UNC Writing Center",
      "url": "https://writingcenter.unc.edu/tips-and-tools/",
      "format": "handouts",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Practical handouts for drafting, argument, evidence, style, and revision.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "hypothesis",
      "name": "Hypothesis",
      "provider": "Hypothesis",
      "url": "https://web.hypothes.is/",
      "format": "annotation tool",
      "access": "open",
      "license": "BSD software; service terms",
      "account": "required",
      "bandwidth": "low",
      "download": false,
      "note": "Open-source web annotation for close reading and shared marginal notes; local notes are an account-free alternative.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "mdn-learn",
      "name": "Learn Web Development",
      "provider": "MDN Web Docs",
      "url": "https://developer.mozilla.org/en-US/docs/Learn_web_development",
      "format": "curriculum",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A structured path from complete beginner to comfortable front-end developer, with tests and challenges.",
      "sourceClass": "open web documentation project",
      "checked": "2026-07-22"
    },
    {
      "id": "odin-foundations",
      "name": "Foundations",
      "provider": "The Odin Project",
      "url": "https://www.theodinproject.com/paths/foundations/courses/foundations",
      "format": "curriculum",
      "access": "open",
      "license": "Open-source curriculum",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A project-based path through command-line tools, HTML, CSS, JavaScript, Git, and deployment.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "webaim-intro",
      "name": "Introduction to Web Accessibility",
      "provider": "WebAIM",
      "url": "https://webaim.org/intro/",
      "format": "guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A practical introduction to disability, barriers, principles, and implementation.",
      "sourceClass": "university-affiliated nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "wcag22",
      "name": "Web Content Accessibility Guidelines 2.2",
      "provider": "W3C Web Accessibility Initiative",
      "url": "https://www.w3.org/TR/WCAG22/",
      "format": "standard",
      "access": "open",
      "license": "W3C document license",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The normative accessibility standard; use it with explanatory guidance and human testing.",
      "sourceClass": "standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "w3c-easy-checks",
      "name": "Easy Checks",
      "provider": "W3C Web Accessibility Initiative",
      "url": "https://www.w3.org/WAI/test-evaluate/preliminary/",
      "format": "checklist",
      "access": "open",
      "license": "W3C document license",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A quick first review of common accessibility barriers; explicitly not a complete conformance test.",
      "sourceClass": "standards body",
      "checked": "2026-07-22"
    },
    {
      "id": "wave",
      "name": "WAVE Web Accessibility Evaluation Tool",
      "provider": "WebAIM",
      "url": "https://wave.webaim.org/",
      "format": "testing tool",
      "access": "free",
      "license": "Free service; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Automated page feedback that helps reveal issues but does not replace keyboard, screen-reader, and user testing.",
      "sourceClass": "university-affiliated nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "github-pages",
      "name": "Creating a GitHub Pages site",
      "provider": "GitHub Docs",
      "url": "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site",
      "format": "guide",
      "access": "free",
      "license": "Free to read; platform terms",
      "account": "required",
      "bandwidth": "low",
      "download": true,
      "note": "A straightforward path for publishing a static site from a repository.",
      "sourceClass": "platform documentation",
      "checked": "2026-07-22"
    },
    {
      "id": "freecodecamp",
      "name": "Responsive Web Design",
      "provider": "freeCodeCamp",
      "url": "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
      "format": "curriculum",
      "access": "open",
      "license": "Open-source curriculum",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Interactive HTML and CSS lessons with projects; an account is useful for saved progress.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "civic-online-reasoning",
      "name": "Civic Online Reasoning",
      "provider": "Digital Inquiry Group",
      "url": "https://cor.inquirygroup.org/",
      "format": "curriculum",
      "access": "free",
      "license": "Free classroom materials; provider terms",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Lessons and assessments for lateral reading, source investigation, and online evidence evaluation.",
      "sourceClass": "nonprofit research group",
      "checked": "2026-07-22"
    },
    {
      "id": "web-literacy",
      "name": "Web Literacy for Student Fact-Checkers",
      "provider": "Mike Caulfield",
      "url": "https://pressbooks.pub/webliteracy/",
      "format": "open book",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A practical field guide to checking claims by leaving a page, tracing evidence, and finding better coverage.",
      "sourceClass": "open book",
      "checked": "2026-07-22"
    },
    {
      "id": "doaj",
      "name": "Directory of Open Access Journals",
      "provider": "DOAJ",
      "url": "https://doaj.org/",
      "format": "research index",
      "access": "open",
      "license": "Open metadata; article licenses vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A nonprofit directory of peer-reviewed open-access journals meeting published quality criteria.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "core",
      "name": "CORE",
      "provider": "The Open University and Jisc",
      "url": "https://core.ac.uk/",
      "format": "research index",
      "access": "open",
      "license": "Open metadata and APIs; item licenses vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A large discovery service for open scholarly literature and repositories.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "openalex",
      "name": "OpenAlex",
      "provider": "OurResearch",
      "url": "https://openalex.org/",
      "format": "research graph",
      "access": "open",
      "license": "CC0 data",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An open catalog of scholarly works, authors, institutions, sources, topics, and citations.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "crossref-search",
      "name": "Crossref Metadata Search",
      "provider": "Crossref",
      "url": "https://search.crossref.org/",
      "format": "metadata search",
      "access": "open",
      "license": "Open metadata",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A DOI and publication-metadata search for locating canonical scholarly records.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "internet-archive",
      "name": "Wayback Machine",
      "provider": "Internet Archive",
      "url": "https://web.archive.org/",
      "format": "web archive",
      "access": "free",
      "license": "Archived-item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A web archive for checking how pages and claims changed over time.",
      "sourceClass": "nonprofit archive",
      "checked": "2026-07-22"
    },
    {
      "id": "nasa-climate",
      "name": "Climate Change",
      "provider": "NASA Science",
      "url": "https://science.nasa.gov/climate-change/",
      "format": "evidence hub",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Current explanations, evidence, causes, effects, and NASA datasets for climate science.",
      "sourceClass": "government science agency",
      "checked": "2026-07-22"
    },
    {
      "id": "ipcc-synthesis",
      "name": "AR6 Synthesis Report",
      "provider": "Intergovernmental Panel on Climate Change",
      "url": "https://www.ipcc.ch/synthesis-report/",
      "format": "assessment report",
      "access": "free",
      "license": "IPCC terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The integrated 2023 assessment of climate science, impacts, adaptation, and mitigation.",
      "sourceClass": "intergovernmental scientific body",
      "checked": "2026-07-22"
    },
    {
      "id": "ipcc-atlas",
      "name": "AR6 Interactive Atlas",
      "provider": "Intergovernmental Panel on Climate Change",
      "url": "https://interactive-atlas.ipcc.ch/",
      "format": "interactive data atlas",
      "access": "free",
      "license": "IPCC terms; open-source components",
      "account": "none",
      "bandwidth": "high",
      "download": false,
      "note": "Maps, graphs, tables, observations, and projections across regions, scenarios, and warming levels.",
      "sourceClass": "intergovernmental scientific body",
      "checked": "2026-07-22"
    },
    {
      "id": "noaa-climate",
      "name": "Climate Education Resource Collection",
      "provider": "NOAA",
      "url": "https://www.noaa.gov/education/resource-collections/climate",
      "format": "resource collection",
      "access": "free",
      "license": "US government publication; linked-item terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Background, activities, data, and teaching resources for climate and Earth systems.",
      "sourceClass": "government science agency",
      "checked": "2026-07-22"
    },
    {
      "id": "clean-collection",
      "name": "CLEAN Collection",
      "provider": "Climate Literacy and Energy Awareness Network",
      "url": "https://cleanet.org/clean/educational_resources/index.html",
      "format": "reviewed collection",
      "access": "free",
      "license": "Linked-item terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A rigorously reviewed collection of climate and energy lessons, visualizations, datasets, and activities.",
      "sourceClass": "research and educator network",
      "checked": "2026-07-22"
    },
    {
      "id": "owid-climate",
      "name": "Climate Change",
      "provider": "Our World in Data",
      "url": "https://ourworldindata.org/climate-change",
      "format": "data and articles",
      "access": "open",
      "license": "CC BY for original work; source-data terms vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A data-rich overview of emissions, energy, temperature, impacts, and country differences.",
      "sourceClass": "nonprofit research project",
      "checked": "2026-07-22"
    },
    {
      "id": "enroads",
      "name": "En-ROADS Climate Solutions Simulator",
      "provider": "Climate Interactive and MIT Sloan",
      "url": "https://www.climateinteractive.org/en-roads/",
      "format": "simulation",
      "access": "free",
      "license": "Free to use; provider terms",
      "account": "none",
      "bandwidth": "high",
      "download": false,
      "note": "A policy simulator for testing combinations of energy, land, industry, and climate actions.",
      "sourceClass": "nonprofit and university project",
      "checked": "2026-07-22"
    },
    {
      "id": "icivics",
      "name": "iCivics",
      "provider": "iCivics",
      "url": "https://ed.icivics.org/",
      "format": "curriculum and games",
      "access": "free",
      "license": "Free to use; item terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "Nonpartisan games, simulations, lessons, document quests, and family activities about civic institutions.",
      "sourceClass": "nonprofit civic education project",
      "checked": "2026-07-22"
    },
    {
      "id": "cornell-lii",
      "name": "Legal Information Institute",
      "provider": "Cornell Law School",
      "url": "https://www.law.cornell.edu/",
      "format": "legal reference",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Free primary and explanatory legal information, including constitutions, statutes, regulations, cases, and Wex.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "wex",
      "name": "Wex Legal Dictionary and Encyclopedia",
      "provider": "Cornell Legal Information Institute",
      "url": "https://www.law.cornell.edu/wex",
      "format": "legal encyclopedia",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A supervised, community-built dictionary for demystifying US legal language; not legal advice.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "oyez",
      "name": "Oyez",
      "provider": "Cornell LII, Justia, and Chicago-Kent",
      "url": "https://www.oyez.org/",
      "format": "case archive",
      "access": "free",
      "license": "Free to access; item terms vary",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Supreme Court case summaries, opinions, argument audio, and justice information.",
      "sourceClass": "university public-interest project",
      "checked": "2026-07-22"
    },
    {
      "id": "congress",
      "name": "Congress.gov",
      "provider": "Library of Congress",
      "url": "https://www.congress.gov/",
      "format": "primary-source database",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Official federal legislative information, including bills, actions, committees, records, and member data.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "regulations",
      "name": "Regulations.gov",
      "provider": "US General Services Administration",
      "url": "https://www.regulations.gov/",
      "format": "public process portal",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Federal rulemaking dockets, notices, supporting documents, and public-comment opportunities.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "census-data",
      "name": "data.census.gov",
      "provider": "US Census Bureau",
      "url": "https://data.census.gov/",
      "format": "data portal",
      "access": "free",
      "license": "US government data",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Primary demographic, social, economic, and housing data for public-context questions.",
      "sourceClass": "government",
      "checked": "2026-07-22"
    },
    {
      "id": "medlineplus-eval",
      "name": "Evaluating Internet Health Information",
      "provider": "National Library of Medicine",
      "url": "https://medlineplus.gov/webeval/webeval.html",
      "format": "tutorial",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A five-part tutorial and downloadable checklist for judging health websites and online claims.",
      "sourceClass": "government health library",
      "checked": "2026-07-22"
    },
    {
      "id": "nccih-science",
      "name": "Know the Science",
      "provider": "National Center for Complementary and Integrative Health",
      "url": "https://www.nccih.nih.gov/health/know-science",
      "format": "interactive modules",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Interactive modules on studies, journal articles, health news, risk, claims, and conflicts of interest.",
      "sourceClass": "government research agency",
      "checked": "2026-07-22"
    },
    {
      "id": "pubmed",
      "name": "PubMed",
      "provider": "National Library of Medicine",
      "url": "https://pubmed.ncbi.nlm.nih.gov/",
      "format": "research index",
      "access": "free",
      "license": "US government database; article rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A biomedical literature index with abstracts, publication types, and links to full text when available.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "clinicaltrials-basics",
      "name": "Learn About Studies",
      "provider": "ClinicalTrials.gov",
      "url": "https://clinicaltrials.gov/study-basics/learn-about-studies",
      "format": "guide and registry",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Guidance for understanding clinical studies and a registry for protocols, status, and reported results.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "openwho",
      "name": "OpenWHO",
      "provider": "World Health Organization",
      "url": "https://openwho.org/",
      "format": "course platform",
      "access": "free",
      "license": "Course terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "Open online courses for emergency response, public health, and operational knowledge.",
      "sourceClass": "intergovernmental health agency",
      "checked": "2026-07-22"
    },
    {
      "id": "cdc-health-literacy",
      "name": "Health Literacy",
      "provider": "US Centers for Disease Control and Prevention",
      "url": "https://www.cdc.gov/health-literacy/php/about/index.html",
      "format": "guidance",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Definitions, tools, and communication practices for finding, understanding, and using health information.",
      "sourceClass": "government health agency",
      "checked": "2026-07-22"
    },
    {
      "id": "cochrane-evidence",
      "name": "Cochrane Evidence",
      "provider": "Cochrane",
      "url": "https://www.cochrane.org/evidence",
      "format": "evidence summaries",
      "access": "free",
      "license": "Free summaries; review rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Plain-language summaries and systematic-review evidence across health interventions.",
      "sourceClass": "nonprofit evidence network",
      "checked": "2026-07-22"
    },
    {
      "id": "world-history-commons",
      "name": "World History Commons",
      "provider": "George Mason University",
      "url": "https://worldhistorycommons.org/",
      "format": "primary-source collection",
      "access": "open",
      "license": "CC BY-NC-SA unless noted",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Primary sources with scholarly context, teaching modules, methods, and website reviews across world history.",
      "sourceClass": "university open project",
      "checked": "2026-07-22"
    },
    {
      "id": "loc-primary",
      "name": "Primary Source Sets",
      "provider": "Library of Congress",
      "url": "https://www.loc.gov/programs/teachers/classroom-materials/primary-source-sets/",
      "format": "primary-source sets",
      "access": "free",
      "license": "US government and item-specific rights",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Sets with historical context and teaching ideas drawn from digitized collections.",
      "sourceClass": "government archive",
      "checked": "2026-07-22"
    },
    {
      "id": "dpla-primary",
      "name": "Primary Source Sets",
      "provider": "Digital Public Library of America",
      "url": "https://dp.la/primary-source-sets",
      "format": "primary-source sets",
      "access": "free",
      "license": "Item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Teacher-reviewed sets combining archival items, overviews, questions, and teaching guides.",
      "sourceClass": "nonprofit digital library",
      "checked": "2026-07-22"
    },
    {
      "id": "smithsonian-lab",
      "name": "Smithsonian Learning Lab",
      "provider": "Smithsonian Institution",
      "url": "https://learninglab.si.edu/",
      "format": "museum learning platform",
      "access": "free",
      "license": "Item rights vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Millions of Smithsonian objects and thousands of assembled learning collections; accounts enable creating and sharing.",
      "sourceClass": "public museum and research institution",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-world-history",
      "name": "World History, Volume 1",
      "provider": "OpenStax",
      "url": "https://openstax.org/details/books/world-history-volume-1",
      "format": "textbook",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A peer-reviewed, openly licensed world-history survey with review questions and source material.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "world-digital-library",
      "name": "World Digital Library Collection",
      "provider": "Library of Congress",
      "url": "https://www.loc.gov/collections/world-digital-library/about-this-collection/",
      "format": "global archive",
      "access": "free",
      "license": "Item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Digitized cultural materials from institutions around the world, with multilingual descriptions.",
      "sourceClass": "government archive and international collaboration",
      "checked": "2026-07-22"
    },
    {
      "id": "europeana",
      "name": "Europeana",
      "provider": "Europeana Foundation",
      "url": "https://www.europeana.eu/en",
      "format": "cultural heritage portal",
      "access": "free",
      "license": "Item rights vary and are labeled",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Digitized art, books, photographs, music, and archival objects from European cultural institutions.",
      "sourceClass": "nonprofit cultural infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "language-transfer",
      "name": "Language Transfer Courses",
      "provider": "Language Transfer",
      "url": "https://www.languagetransfer.org/courses",
      "format": "audio course",
      "access": "free",
      "license": "Free to use and download; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Beginner-friendly audio courses built around pausing, thinking, and answering aloud.",
      "sourceClass": "independent educational project",
      "checked": "2026-07-22"
    },
    {
      "id": "tatoeba",
      "name": "Tatoeba",
      "provider": "Tatoeba Association",
      "url": "https://tatoeba.org/en/",
      "format": "sentence corpus",
      "access": "open",
      "license": "Creative Commons licenses vary by contribution",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An open, collaborative corpus of translated example sentences across hundreds of languages.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-07-22"
    },
    {
      "id": "wiktionary",
      "name": "Wiktionary",
      "provider": "Wikimedia community",
      "url": "https://www.wiktionary.org/",
      "format": "dictionary",
      "access": "open",
      "license": "CC BY-SA",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A multilingual dictionary with definitions, pronunciation, etymology, inflection, and usage examples.",
      "sourceClass": "nonprofit open-knowledge project",
      "checked": "2026-07-22"
    },
    {
      "id": "librivox",
      "name": "LibriVox",
      "provider": "LibriVox volunteers",
      "url": "https://librivox.org/",
      "format": "audio library",
      "access": "open",
      "license": "Public-domain recordings",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Volunteer-read public-domain books for listening, shadowing, and transcript comparison.",
      "sourceClass": "volunteer public-domain project",
      "checked": "2026-07-22"
    },
    {
      "id": "easy-languages",
      "name": "Easy Languages",
      "provider": "Easy Languages",
      "url": "https://www.easy-languages.org/",
      "format": "street-interview videos",
      "access": "free",
      "license": "Free to watch; provider terms",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Natural speech videos with on-screen subtitles across many languages.",
      "sourceClass": "nonprofit media project",
      "checked": "2026-07-22"
    },
    {
      "id": "storyweaver",
      "name": "StoryWeaver",
      "provider": "Pratham Books",
      "url": "https://storyweaver.org.in/en/",
      "format": "multilingual story library",
      "access": "open",
      "license": "CC BY 4.0 for stories and illustrations; media exceptions",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "Open multilingual children’s stories that can be read, downloaded, adapted, and translated.",
      "sourceClass": "nonprofit open-content project",
      "checked": "2026-07-22"
    },
    {
      "id": "phet",
      "name": "PhET Interactive Simulations",
      "provider": "University of Colorado Boulder",
      "url": "https://phet.colorado.edu/en/",
      "format": "interactive simulations",
      "access": "open",
      "license": "Open-source software; CC BY content unless noted",
      "account": "none",
      "bandwidth": "high",
      "download": true,
      "note": "Research-based math and science simulations with immediate feedback, downloads, translations, and accessible options.",
      "sourceClass": "university open project",
      "checked": "2026-07-22"
    },
    {
      "id": "hhmi",
      "name": "HHMI BioInteractive",
      "provider": "Howard Hughes Medical Institute",
      "url": "https://www.biointeractive.org/",
      "format": "science resources",
      "access": "free",
      "license": "Free educational use; item terms vary",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "Scientifically reviewed films, data points, virtual labs, activities, and real research datasets.",
      "sourceClass": "nonprofit research institute",
      "checked": "2026-07-22"
    },
    {
      "id": "openstax-science",
      "name": "OpenStax Science Textbooks",
      "provider": "OpenStax",
      "url": "https://openstax.org/subjects/science",
      "format": "textbook library",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Peer-reviewed open textbooks in biology, chemistry, physics, astronomy, and related fields.",
      "sourceClass": "university nonprofit",
      "checked": "2026-07-22"
    },
    {
      "id": "science-buddies",
      "name": "Science Buddies Project Guide",
      "provider": "Science Buddies",
      "url": "https://www.sciencebuddies.org/science-fair-projects/science-fair",
      "format": "project guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Step-by-step guidance for questions, variables, experiments, data, and science-fair reports.",
      "sourceClass": "nonprofit science education project",
      "checked": "2026-07-22"
    },
    {
      "id": "zooniverse",
      "name": "Zooniverse",
      "provider": "Citizen Science Alliance",
      "url": "https://www.zooniverse.org/",
      "format": "citizen science",
      "access": "open",
      "license": "Open-source platform; project data terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Real research projects where volunteers classify images, transcribe records, and contribute observations.",
      "sourceClass": "nonprofit research collaboration",
      "checked": "2026-07-22"
    },
    {
      "id": "inaturalist",
      "name": "iNaturalist",
      "provider": "California Academy of Sciences and National Geographic Society",
      "url": "https://www.inaturalist.org/",
      "format": "observation platform",
      "access": "open",
      "license": "Open-source platform; observation licenses vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "A biodiversity observation network for identifying organisms and contributing research-grade records.",
      "sourceClass": "nonprofit research platform",
      "checked": "2026-07-22"
    },
    {
      "id": "scratch",
      "name": "Scratch",
      "provider": "MIT Media Lab",
      "url": "https://scratch.mit.edu/",
      "format": "creative coding platform",
      "access": "open",
      "license": "Open-source editor; project media licenses vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Block-based creative coding for stories, games, simulations, and remixes.",
      "sourceClass": "university nonprofit project",
      "checked": "2026-07-22"
    },
    {
      "id": "exercism",
      "name": "Exercism",
      "provider": "Exercism",
      "url": "https://exercism.org/",
      "format": "practice platform",
      "access": "open",
      "license": "Open-source platform and exercises",
      "account": "required",
      "bandwidth": "low",
      "download": false,
      "note": "Free programming practice across many languages with automated analysis and optional human mentoring.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-07-22"
    },
    {
      "id": "carpentries",
      "name": "The Carpentries Lessons",
      "provider": "The Carpentries",
      "url": "https://carpentries.org/lessons/",
      "format": "lesson collection",
      "access": "open",
      "license": "CC BY 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Collaboratively developed, tested lessons in coding, data, research computing, and library skills.",
      "sourceClass": "nonprofit open education project",
      "checked": "2026-07-22"
    },
    {
      "id": "khan-kids",
      "name": "Khan Academy Kids",
      "provider": "Khan Academy",
      "url": "https://www.khanacademy.org/kids",
      "format": "early-learning app",
      "access": "free",
      "license": "Free app; provider terms",
      "account": "required",
      "bandwidth": "high",
      "download": false,
      "note": "An ad-free, no-subscription early-learning program for ages two to eight with books, games, and creative activities.",
      "sourceClass": "nonprofit education project",
      "checked": "2026-07-22"
    },
    {
      "id": "bookshare",
      "name": "Bookshare",
      "provider": "Benetech",
      "url": "https://www.bookshare.org/",
      "format": "accessible ebook library",
      "access": "mixed",
      "license": "Specialized-access and item rights",
      "account": "eligibility",
      "bandwidth": "low",
      "download": true,
      "note": "Accessible ebooks with audio, highlighting, large text, and braille; most copyrighted titles require a qualifying print disability.",
      "sourceClass": "nonprofit accessibility service",
      "checked": "2026-07-22"
    },
    {
      "id": "pbs-learningmedia",
      "name": "PBS LearningMedia",
      "provider": "PBS and local stations",
      "url": "https://www.pbslearningmedia.org/",
      "format": "media library",
      "access": "free",
      "license": "Free to use; item terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Educational video, interactives, lesson plans, and primary sources across grade levels and subjects.",
      "sourceClass": "public media education project",
      "checked": "2026-07-22"
    },
    {
      "id": "code-org",
      "name": "Code.org",
      "provider": "Code.org",
      "url": "https://code.org/students",
      "format": "coding curriculum",
      "access": "free",
      "license": "Free to use; curriculum terms vary",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "Guided computer-science courses and creative projects for children and beginners.",
      "sourceClass": "nonprofit education project",
      "checked": "2026-07-22"
    },
    {
      "id": "global-digital-library",
      "name": "Global Digital Library",
      "provider": "Global Digital Library",
      "url": "https://digitallibrary.io/",
      "format": "multilingual story library",
      "access": "open",
      "license": "Open licenses vary by item",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Early-grade reading books and learning materials in many languages, built for broad access.",
      "sourceClass": "international education initiative",
      "checked": "2026-07-22"
    },
    {
      "id": "cs50x",
      "name": "CS50x",
      "provider": "Harvard University",
      "url": "https://cs50.harvard.edu/x/2026/",
      "format": "course",
      "access": "free",
      "license": "Free course access; code and material terms vary",
      "account": "optional",
      "bandwidth": "high",
      "download": true,
      "note": "A current introductory computer-science course with problem sets and a final project; prior experience is not required.",
      "sourceClass": "university",
      "checked": "2026-07-22"
    },
    {
      "id": "openalex-api",
      "name": "OpenAlex API and Data",
      "provider": "OurResearch",
      "url": "https://docs.openalex.org/",
      "format": "documentation and data",
      "access": "open",
      "license": "CC0 data",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Open documentation for querying and downloading the scholarly graph.",
      "sourceClass": "nonprofit scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "eric",
      "name": "ERIC",
      "provider": "US Department of Education",
      "url": "https://eric.ed.gov/",
      "format": "research index",
      "access": "free",
      "license": "US government database; item rights vary",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An education research index with descriptors, abstracts, and links to available full text.",
      "sourceClass": "government scholarly infrastructure",
      "checked": "2026-07-22"
    },
    {
      "id": "worldcat",
      "name": "WorldCat",
      "provider": "OCLC",
      "url": "https://search.worldcat.org/",
      "format": "library catalog",
      "access": "free",
      "license": "Free search; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A union catalog for locating books and other materials in libraries, including nearby holdings.",
      "sourceClass": "library cooperative",
      "checked": "2026-07-22"
    },
    {
      "id": "cpsc-recalls",
      "name": "Recalls",
      "provider": "U.S. Consumer Product Safety Commission",
      "url": "https://www.cpsc.gov/Recalls",
      "format": "search tool",
      "access": "free",
      "license": "US government data",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Search US product recalls by product, brand, and hazard, with CSV downloads; check here before opening, repairing, or passing on an item.",
      "sourceClass": "government safety regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-warranties",
      "name": "Warranties",
      "provider": "Federal Trade Commission",
      "url": "https://consumer.ftc.gov/articles/warranties",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Explains written and implied warranties in the US and states that a manufacturer cannot require specific parts or services to keep warranty coverage unless it provides them free or has an FTC waiver.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "eu-right-to-repair",
      "name": "Directive on repair of goods",
      "provider": "European Commission",
      "url": "https://commission.europa.eu/law/law-topic/consumer-protection-law/directive-repair-goods_en",
      "format": "legal summary",
      "access": "open",
      "license": "CC BY 4.0 under the Commission site legal notice, unless otherwise indicated",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Summarizes Directive (EU) 2024/1799, applied by Member States from 31 July 2026: manufacturers must repair listed products such as smartphones and refrigerators at a reasonable price, and repairers can quote on a standard European Repair Information Form.",
      "sourceClass": "EU public institution",
      "checked": "2026-09-29"
    },
    {
      "id": "open-repair-insights",
      "name": "Insights",
      "provider": "Open Repair Alliance",
      "url": "https://openrepair.org/open-data/insights/",
      "format": "data analysis",
      "access": "free",
      "license": "Free to read; no license stated on the insight pages",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Analyses of combined community repair records by device type (mobiles, laptops, tablets, printers, batteries, vacuum cleaners), including fault types classified by volunteers from thousands of repair descriptions.",
      "sourceClass": "nonprofit repair coalition",
      "checked": "2026-09-29"
    },
    {
      "id": "open-repair-standard",
      "name": "Open Repair Data Standard",
      "provider": "Open Repair Alliance",
      "url": "https://standard.openrepair.org/",
      "format": "standard",
      "access": "free",
      "license": "Copyright Open Repair Alliance; data collected under it is shared under Creative Commons",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The shared record format for community repairs, version 0.3: product category, brand, year of manufacture, problem, repair status (fixed, repairable, end of life), and the barrier when an item cannot be fixed.",
      "sourceClass": "nonprofit repair coalition",
      "checked": "2026-09-29"
    },
    {
      "id": "restart-top-tips",
      "name": "Top tips: fixing cameras, laptops, printers and smartphones",
      "provider": "The Restart Project",
      "url": "https://therestartproject.org/top-tips-fixing-cameras-laptops-printers-mobiles/",
      "format": "guide",
      "access": "free",
      "license": "Free to read; no license stated",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Undated first checks from a UK repair charity, such as cleaning a laptop fan, freeing drive space, and switching off a wet phone to dry for 24 to 48 hours before trying it.",
      "sourceClass": "nonprofit repair charity",
      "checked": "2026-09-29"
    },
    {
      "id": "restart-repair-options",
      "name": "Repair options",
      "provider": "The Restart Project",
      "url": "https://therestartproject.org/repair-options/",
      "format": "directory",
      "access": "free",
      "license": "Free to read; no license stated",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "A mostly UK directory of ways to get something repaired: free community repair events, fixing it yourself, professional repairers, and donating devices that cannot be saved.",
      "sourceClass": "nonprofit repair charity",
      "checked": "2026-09-29"
    },
    {
      "id": "repair-cafe-tips",
      "name": "Tips & tricks",
      "provider": "Repair Café International Foundation",
      "url": "https://www.repaircafe.org/en/community/tips-tricks/",
      "format": "articles",
      "access": "free",
      "license": "Copyright Repair Café; no reuse license stated",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Short articles on common faults and care for laptops, coffee makers, heaters, televisions, toys, furniture, and more; they name the usual failures and leave detailed steps to repair events.",
      "sourceClass": "nonprofit foundation",
      "checked": "2026-09-29"
    },
    {
      "id": "repair-cafe-faq",
      "name": "Repair Café FAQ",
      "provider": "Repair Café International Foundation",
      "url": "https://www.repaircafe.org/en/faq/",
      "format": "guide",
      "access": "free",
      "license": "Copyright Repair Café; no reuse license stated",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "What to expect at a Repair Café: visitors bring appliances, clothing, furniture, crockery, bicycles, and toys they can carry, help from volunteer repairers is free, and a donation is welcome.",
      "sourceClass": "nonprofit foundation",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-nixing-the-fix",
      "name": "Nixing the Fix: An FTC Report to Congress on Repair Restrictions",
      "provider": "Federal Trade Commission",
      "url": "https://www.ftc.gov/reports/nixing-fix-ftc-report-congress-repair-restrictions",
      "format": "report",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The FTC's May 2021 report on how manufacturers restrict repair and what could widen repair options, as a free PDF.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "fda-nutrition-label",
      "name": "How to Understand and Use the Nutrition Facts Label",
      "provider": "U.S. Food and Drug Administration",
      "url": "https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Explains serving size, calories, and percent Daily Value on the US label, including that 5 percent DV or less per serving is low and 20 percent or more is high.",
      "sourceClass": "government health agency",
      "checked": "2026-09-29"
    },
    {
      "id": "open-food-facts",
      "name": "Open Food Facts",
      "provider": "Open Food Facts",
      "url": "https://world.openfoodfacts.org/discover",
      "format": "product database",
      "access": "open",
      "license": "Open Database Licence (ODbL) for the database",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "A nonprofit, volunteer-built database of more than 4 million food products from 150 countries, with no ads; entries are typed in by contributors, so check a record against the pack in your hand.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-09-29"
    },
    {
      "id": "cma-green-claims-code",
      "name": "Making environmental claims on goods and services",
      "provider": "Competition and Markets Authority",
      "url": "https://www.gov.uk/government/publications/green-claims-code-making-environmental-claims/environmental-claims-on-goods-and-services",
      "format": "guidance",
      "access": "open",
      "license": "Open Government Licence v3.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "The UK Green Claims Code of September 2021: claims must be truthful and accurate, clear, not omit important information, make fair comparisons, consider the full life cycle, and be substantiated.",
      "sourceClass": "government competition regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-green-guides-summary",
      "name": "Environmental Claims: Summary of the Green Guides",
      "provider": "Federal Trade Commission",
      "url": "https://www.ftc.gov/business-guidance/resources/environmental-claims-summary-green-guides",
      "format": "guidance",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A short 2012 summary of the US Green Guides: broad claims like 'green' or 'eco-friendly' should not be made unqualified, with rules for recyclable, compostable, carbon offset, free-of, and certification claims.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "eu-ecgt-qa",
      "name": "Questions and Answers on Directive (EU) 2024/825, the EU green transition consumer rules",
      "provider": "European Commission, Directorate-General for Justice and Consumers",
      "url": "https://commission.europa.eu/document/download/3c257883-bb2a-4dd9-a6dc-501d587bb34f_en?filename=faq-empowerting-consumers-gtd.pdf",
      "format": "questions and answers",
      "access": "open",
      "license": "CC BY 4.0 under the Commission site legal notice, unless otherwise indicated",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A 20-page September 2026 Commission document on Directive (EU) 2024/825, which applies from 27 September 2026, covering generic environmental claims, sustainability labels, offset-based climate claims, future performance claims, and social claims; it states preliminary views, not a binding interpretation.",
      "sourceClass": "EU public institution",
      "checked": "2026-09-29"
    },
    {
      "id": "epa-ecolabel-recommendations",
      "name": "Recommendations of Specifications, Standards, and Ecolabels for Federal Purchasing",
      "provider": "U.S. Environmental Protection Agency",
      "url": "https://www.epa.gov/greenerproducts/recommendations-specifications-standards-and-ecolabels-federal-purchasing",
      "format": "search tool",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "A searchable list of more than 60 private standards and ecolabels in more than 40 purchase categories that EPA assessed against its published framework; a seal missing from the list is a question to ask, not proof of a problem.",
      "sourceClass": "government environmental agency",
      "checked": "2026-09-29"
    },
    {
      "id": "un-hleg-net-zero",
      "name": "Integrity Matters: Net Zero Commitments by Businesses, Financial Institutions, Cities and Regions",
      "provider": "United Nations High-Level Expert Group on the Net Zero Emissions Commitments of Non-State Entities",
      "url": "https://www.un.org/en/climatechange/high-level-expert-group",
      "format": "report",
      "access": "free",
      "license": "Free to read; no reuse license stated",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The expert group's page and its November 2022 report, whose ten recommendations include interim targets for 2025, 2030, and 2035, no buying cheap credits in place of cutting emissions, and a public transition plan.",
      "sourceClass": "intergovernmental organization",
      "checked": "2026-09-29"
    },
    {
      "id": "fcac-budget",
      "name": "Making a budget",
      "provider": "Financial Consumer Agency of Canada",
      "url": "https://www.canada.ca/en/financial-consumer-agency/services/make-budget.html",
      "format": "guide",
      "access": "free",
      "license": "Government of Canada terms; non-commercial reproduction allowed",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "A four-step method (set goals, track spending, separate needs from wants, review) from a Canadian government agency, with a free online Budget Planner.",
      "sourceClass": "government consumer agency",
      "checked": "2026-09-29"
    },
    {
      "id": "cfpb-your-money-your-goals",
      "name": "Your Money, Your Goals",
      "provider": "Consumer Financial Protection Bureau",
      "url": "https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/",
      "format": "toolkit",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Printable worksheets on goals, income, spending, bills, credit, and debt, written for people who help others with money and usable on your own; the page says it is general information, not legal advice.",
      "sourceClass": "government consumer finance regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "ask-cfpb",
      "name": "Ask CFPB",
      "provider": "Consumer Financial Protection Bureau",
      "url": "https://www.consumerfinance.gov/ask-cfpb/",
      "format": "reference",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Plain answers to hundreds of US money questions on credit reports, bank accounts, mortgages, debt collection, and credit cards; general information, not legal advice.",
      "sourceClass": "government consumer finance regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "cfpb-credit-reports",
      "name": "Credit reports and scores",
      "provider": "Consumer Financial Protection Bureau",
      "url": "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "How to get your US credit reports, what to check in them, how a report differs from a score, and how to dispute an error.",
      "sourceClass": "government consumer finance regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-free-credit-reports",
      "name": "Free Credit Reports",
      "provider": "Federal Trade Commission",
      "url": "https://consumer.ftc.gov/articles/free-credit-reports",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Names AnnualCreditReport.com as the only authorized site for free reports from the three US bureaus, now available weekly, and warns about lookalike sites and emails asking for your Social Security number.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "finra-fees",
      "name": "Fees and Commissions",
      "provider": "FINRA",
      "url": "https://www.finra.org/investors/investing/investing-basics/fees-commissions",
      "format": "guide",
      "access": "free",
      "license": "Copyright FINRA; all rights reserved",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Sorts investment costs into transaction costs, advisory fees, and ongoing expenses, notes that zero-commission trading still carries costs, and gives a one-line fee example that cites an SEC bulletin.",
      "sourceClass": "government-authorized nonprofit regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "sec-fees-bulletin",
      "name": "Investor Bulletin: How Fees and Expenses Affect Your Investment Portfolio",
      "provider": "U.S. Securities and Exchange Commission, Office of Investor Education and Advocacy",
      "url": "https://www.sec.gov/investor/alerts/ib_fees_expenses.pdf",
      "format": "bulletin",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A six-page bulletin charting $100,000 at a 4 percent annual return over 20 years with an ongoing fee of 0.25, 0.50, or 1 percent.",
      "sourceClass": "government securities regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "finra-professionals",
      "name": "Working With an Investment Professional",
      "provider": "FINRA",
      "url": "https://www.finra.org/investors/investing/working-with-investment-professional",
      "format": "guide",
      "access": "free",
      "license": "Copyright FINRA; all rights reserved",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Explains the kinds of US financial professionals, the ways they are paid (commissions, asset-based, flat, hourly), conflict-of-interest questions to ask, and how to look someone up on BrokerCheck.",
      "sourceClass": "government-authorized nonprofit regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "fca-scams",
      "name": "Protect yourself from scams",
      "provider": "Financial Conduct Authority",
      "url": "https://www.fca.org.uk/consumers/protect-yourself-scams",
      "format": "guide",
      "access": "free",
      "license": "Copyright FCA; all rights reserved",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "The UK regulator's warning signs of investment scams (calls out of the blue, time pressure, high returns, being specially chosen) and how to check a firm with the FCA Firm Checker and Warning List.",
      "sourceClass": "government financial regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-avoid-scams",
      "name": "How To Avoid a Scam",
      "provider": "Federal Trade Commission",
      "url": "https://consumer.ftc.gov/articles/how-avoid-scam",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Four signs of a scam: pretending to be a known organization, a problem or prize, pressure to act before you think, and demands to pay a specific way such as a gift card, crypto, or wire transfer.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "eff-ssd-security-plan",
      "name": "Your Security Plan",
      "provider": "Electronic Frontier Foundation",
      "url": "https://ssd.eff.org/module/your-security-plan",
      "format": "guide",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "A threat-modeling guide built on six questions: what you protect, from whom, how bad failure would be, how likely it is, how much trouble you will take, and who your allies are.",
      "sourceClass": "nonprofit digital rights organization",
      "checked": "2026-09-29"
    },
    {
      "id": "eff-ssd-passwords",
      "name": "Creating Strong Passwords",
      "provider": "Electronic Frontier Foundation",
      "url": "https://ssd.eff.org/module/creating-strong-passwords",
      "format": "guide",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Why reusing passwords is dangerous, how password managers work, and how to make a dice-generated passphrase of at least six words for the few passwords you must remember; it endorses no password manager.",
      "sourceClass": "nonprofit digital rights organization",
      "checked": "2026-09-29"
    },
    {
      "id": "eff-ssd-2fa",
      "name": "How to: Enable Two-factor Authentication",
      "provider": "Electronic Frontier Foundation",
      "url": "https://ssd.eff.org/module/how-enable-two-factor-authentication",
      "format": "guide",
      "access": "open",
      "license": "CC BY",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Compares SMS codes, authenticator apps, security keys, and passkeys, with the weakness of each, and says to print and store backup codes.",
      "sourceClass": "nonprofit digital rights organization",
      "checked": "2026-09-29"
    },
    {
      "id": "openlearn-cyber-security",
      "name": "Introduction to cyber security: stay safe online",
      "provider": "The Open University",
      "url": "https://www.open.edu/openlearn/digital-computing/introduction-cyber-security-stay-safe-online/content-section-overview",
      "format": "course",
      "access": "open",
      "license": "Creative Commons licence, per the course page",
      "account": "optional",
      "bandwidth": "low",
      "download": true,
      "note": "A free 24-hour introductory course over eight weeks on passwords, two-factor authentication, malware, encryption, and identity theft; you can start without signing up, and signing up adds quizzes and a badge.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ncsc-cyber-aware",
      "name": "Cyber Aware",
      "provider": "National Cyber Security Centre",
      "url": "https://www.ncsc.gov.uk/cyberaware/home",
      "format": "guidance",
      "access": "free",
      "license": "Free to read; no licence stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Six actions from the UK cybersecurity agency, starting with a strong separate password for your email, plus three random words, 2-step verification, password managers, updates, and backups.",
      "sourceClass": "government cybersecurity agency",
      "checked": "2026-09-29"
    },
    {
      "id": "cisa-secure-our-world",
      "name": "Secure Our World",
      "provider": "Cybersecurity and Infrastructure Security Agency",
      "url": "https://www.cisa.gov/secure-our-world",
      "format": "guidance",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Four steps from the US cybersecurity agency: recognize and report phishing, use strong passwords and a password manager, turn on multifactor authentication, and update software; tip sheets come in several languages.",
      "sourceClass": "government cybersecurity agency",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-phishing",
      "name": "How To Recognize and Avoid Phishing Scams",
      "provider": "Federal Trade Commission",
      "url": "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "The signs of phishing emails and texts, what to do if you already replied or clicked, and where to report them.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "ncsc-hacked-account",
      "name": "Recovering a hacked account",
      "provider": "National Cyber Security Centre",
      "url": "https://www.ncsc.gov.uk/guidance/recovering-a-hacked-account",
      "format": "guidance",
      "access": "free",
      "license": "Free to read; no licence stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Nine steps after an account is taken over, including checking email forwarding rules, signing out unknown devices, changing reused passwords, and turning on 2-step verification.",
      "sourceClass": "government cybersecurity agency",
      "checked": "2026-09-29"
    },
    {
      "id": "ftc-online-tracking",
      "name": "How Websites and Apps Collect and Use Your Information",
      "provider": "Federal Trade Commission",
      "url": "https://consumer.ftc.gov/articles/how-protect-your-privacy-online",
      "format": "guide",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Explains cookies, pixels, device fingerprinting, and advertising IDs, what browser and phone privacy settings can control, and that private browsing does not stop websites seeing your activity.",
      "sourceClass": "government consumer protection agency",
      "checked": "2026-09-29"
    },
    {
      "id": "ico-subject-access",
      "name": "Getting copies of your information (SAR)",
      "provider": "Information Commissioner's Office",
      "url": "https://ico.org.uk/for-the-public/getting-copies-of-your-information-subject-access-request/",
      "format": "guide",
      "access": "open",
      "license": "Open Government Licence v3.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "How to ask a UK organization for a copy of the personal data it holds on you: what to write, that anyone can ask without a lawyer, and that organizations usually have one month to respond.",
      "sourceClass": "government data protection regulator",
      "checked": "2026-09-29"
    },
    {
      "id": "security-in-a-box",
      "name": "Security in a Box",
      "provider": "Front Line Defenders",
      "url": "https://securityinabox.org/en/",
      "format": "guide collection",
      "access": "open",
      "license": "CC BY-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Step-by-step guides on passwords, two-factor authentication, messaging, and securing Android, iOS, Windows, Mac, and Linux devices, from a human rights nonprofit that sells nothing.",
      "sourceClass": "nonprofit human rights organization",
      "checked": "2026-09-29"
    },
    {
      "id": "automate-boring",
      "name": "Automate the Boring Stuff with Python",
      "provider": "Al Sweigart",
      "url": "https://automatetheboringstuff.com/",
      "format": "open book",
      "access": "open",
      "license": "CC BY-NC-SA 3.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "The full third edition, free to read online, with chapters on reading and writing files, organizing files, and spreadsheets. The files used in the book download as one zip. The same site sells the print book and a video course; the online text needs neither.",
      "sourceClass": "open book",
      "checked": "2026-09-29"
    },
    {
      "id": "py4e",
      "name": "Python for Everybody",
      "provider": "Charles Severance",
      "url": "https://www.py4e.com/",
      "format": "course and open book",
      "access": "open",
      "license": "CC BY 4.0",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "A Python course for people new to programming, with lessons from installing Python through files, lists, and dictionaries. Lessons open without login; an account adds graded exercises. The book downloads as PDF or EPUB and has translations in more than ten languages.",
      "sourceClass": "independent educational project",
      "checked": "2026-09-29"
    },
    {
      "id": "python-tutorial",
      "name": "The Python Tutorial",
      "provider": "Python Software Foundation",
      "url": "https://docs.python.org/3/tutorial/",
      "format": "tutorial",
      "access": "open",
      "license": "PSF License Version 2; code examples Zero Clause BSD",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The official tour of the language: control flow, data structures, input and output, errors and exceptions, and the standard library. It says it is written for people who already program, so routes use it as a second explanation beside a beginner text. The documentation downloads as HTML, plain text, or EPUB.",
      "sourceClass": "nonprofit open-source project",
      "checked": "2026-09-29"
    },
    {
      "id": "swc-python",
      "name": "Programming with Python",
      "provider": "Software Carpentry",
      "url": "https://swcarpentry.github.io/python-novice-inflammation/",
      "format": "lesson",
      "access": "open",
      "license": "CC BY 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A novice lesson that builds a small data analysis step by step: lists, loops, multiple files, making choices, functions, errors, defensive programming, and debugging. It expects you to know files and folders and how to start Python. Data, code, and a single-page version download.",
      "sourceClass": "nonprofit open education project",
      "checked": "2026-09-29"
    },
    {
      "id": "learnosm-beginner",
      "name": "LearnOSM Beginner's Guide",
      "provider": "Humanitarian OpenStreetMap Team",
      "url": "https://learnosm.org/en/beginner/",
      "format": "guide",
      "access": "open",
      "license": "CC0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Step-by-step chapters on the OpenStreetMap website, the iD browser editor, adding points, lines, and areas with tags, saving with a changeset comment, and map notes. Reading needs no account; editing the map needs an OpenStreetMap account.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-09-29"
    },
    {
      "id": "osm-copyright",
      "name": "Copyright and License",
      "provider": "OpenStreetMap Foundation",
      "url": "https://www.openstreetmap.org/copyright",
      "format": "policy",
      "access": "open",
      "license": "Map data under the Open Database License (ODbL)",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "The rules for using and adding OpenStreetMap data: credit the contributors, share alike under the Open Database License, and never copy from copyrighted sources such as Google Maps or printed maps without permission.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-09-29"
    },
    {
      "id": "field-papers",
      "name": "Field Papers",
      "provider": "OpenStreetMap US",
      "url": "https://fieldpapers.org/",
      "format": "field survey tool",
      "access": "free",
      "license": "Open-source code on GitHub; license not stated on the site",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "Print a multi-page map atlas of any area, write notes on it outdoors, then photograph the pages and upload them to transcribe your notes as points or areas. Works without an account, and paper is all you carry in the field.",
      "sourceClass": "open-source project",
      "checked": "2026-09-29"
    },
    {
      "id": "streetcomplete",
      "name": "StreetComplete",
      "provider": "StreetComplete contributors",
      "url": "https://streetcomplete.app/",
      "format": "mobile survey app",
      "access": "open",
      "license": "GPL-3.0",
      "account": "required",
      "bandwidth": "medium",
      "download": true,
      "note": "A free app that finds missing map details near you and turns them into simple questions you answer on the spot; answers go into OpenStreetMap under your account. No ads; supported by donations. Listed for Android only (Google Play and F-Droid) when checked.",
      "sourceClass": "open-source project",
      "checked": "2026-09-29"
    },
    {
      "id": "osm-community",
      "name": "OpenStreetMap Community Forum",
      "provider": "OpenStreetMap Foundation",
      "url": "https://community.openstreetmap.org/",
      "format": "forum",
      "access": "free",
      "license": "Free to read; OpenStreetMap Foundation terms",
      "account": "optional",
      "bandwidth": "low",
      "download": false,
      "note": "The official discussion forum, with a help and support section and country and regional community sections where local mappers answer questions. Reading is open; starting a topic needs an account.",
      "sourceClass": "nonprofit open-data project",
      "checked": "2026-09-29"
    },
    {
      "id": "fao-garden",
      "name": "A Vegetable Garden for All",
      "provider": "Food and Agriculture Organization of the United Nations",
      "url": "https://www.fao.org/4/i3556e/i3556e.pdf",
      "format": "manual",
      "access": "open",
      "license": "FAO copyright; non-commercial copying and printing allowed with credit",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "An illustrated self-instruction manual for families with small plots: soil care, compost, a sowing calendar, seedlings in bottles, boxes and hydroponic containers for very small spaces, pest control, and harvest records. This fifth edition (FAO, 2014) is adapted to Caribbean conditions, so check timings against your own climate.",
      "sourceClass": "intergovernmental agency",
      "checked": "2026-09-29"
    },
    {
      "id": "osu-containers",
      "name": "No yard? Grow vegetables in containers",
      "provider": "Oregon State University Extension Service",
      "url": "https://extension.oregonstate.edu/news/no-yard-grow-vegetables-containers",
      "format": "extension article",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Extension advice on container sizes by crop, packaged potting mix instead of garden soil, drainage, sun (six to eight hours of direct sun for fruiting crops, less for leaves and roots), watering, and feeding.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "rhs-containers",
      "name": "Vegetables in containers",
      "provider": "Royal Horticultural Society",
      "url": "https://www.rhs.org.uk/vegetables/containers",
      "format": "guide",
      "access": "free",
      "license": "RHS copyright; free to read",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Advice from a UK horticultural charity on container depth, peat-free growing media, watering, feeding, and the crops that suit pots. The page also links to the society's plant shop and membership offers.",
      "sourceClass": "horticultural charity",
      "checked": "2026-09-29"
    },
    {
      "id": "epa-garden-lead",
      "name": "Healthy Gardening Practices to Reduce Exposure to Lead-Contaminated Soil",
      "provider": "US Environmental Protection Agency",
      "url": "https://www.epa.gov/lead/healthy-gardening-practices-reduce-exposure-lead-contaminated-soil",
      "format": "guidance",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Where to get garden soil tested for lead, what different levels suggest, raised beds of clean soil over a visible barrier, and washing hands and produce after gardening. Written for US readers; testing options differ elsewhere.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "elements-of-ai",
      "name": "Elements of AI",
      "provider": "University of Helsinki and MinnaLearn",
      "url": "https://www.elementsofai.com/",
      "format": "course",
      "access": "free",
      "license": "All rights reserved by MinnaLearn and the University of Helsinki",
      "account": "optional",
      "bandwidth": "medium",
      "download": false,
      "note": "A six-chapter introduction to what AI is, problem solving, probability, machine learning, neural networks, and social implications, with no math or programming required, in more than 40 languages. Chapters read without an account; exercises need sign-up. The makers say it is not yet fully usable with a screen reader.",
      "sourceClass": "university and education company",
      "checked": "2026-09-29"
    },
    {
      "id": "nist-ai-rmf",
      "name": "AI Risk Management Framework",
      "provider": "US National Institute of Standards and Technology",
      "url": "https://www.nist.gov/itl/ai-risk-management-framework",
      "format": "framework",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A voluntary framework, released in January 2023, that names the characteristics of trustworthy AI (valid and reliable, safe, secure and resilient, accountable and transparent, explainable and interpretable, privacy-enhanced, fair with harmful bias managed) and four functions: govern, map, measure, manage. The full text (NIST AI 100-1) is a free PDF.",
      "sourceClass": "government standards agency",
      "checked": "2026-09-29"
    },
    {
      "id": "nist-genai-profile",
      "name": "Generative Artificial Intelligence Profile (NIST AI 600-1)",
      "provider": "US National Institute of Standards and Technology",
      "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
      "format": "framework profile",
      "access": "free",
      "license": "US government publication",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A July 2024 companion to the AI Risk Management Framework that defines twelve risks made new or worse by generative AI, including confabulation (confidently stated false output), harmful bias, data privacy, and information integrity, with suggested actions to manage them.",
      "sourceClass": "government standards agency",
      "checked": "2026-09-29"
    },
    {
      "id": "ai-incident-database",
      "name": "AI Incident Database",
      "provider": "Responsible AI Collaborative",
      "url": "https://incidentdatabase.ai/",
      "format": "incident database",
      "access": "free",
      "license": "Free to search and download; content license not stated",
      "account": "optional",
      "bandwidth": "medium",
      "download": true,
      "note": "A searchable record of harms and near-harms from deployed AI systems, modeled on incident databases in aviation and computer security. Run by a nonprofit; anyone can submit a report, and full snapshots of the database download.",
      "sourceClass": "nonprofit research collaboration",
      "checked": "2026-09-29"
    },
    {
      "id": "ready-plan",
      "name": "Make A Plan",
      "provider": "Ready.gov, US Department of Homeland Security",
      "url": "https://www.ready.gov/plan",
      "format": "guide",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Four steps for a household plan: talk it through, list each person's needs, write it down, and practice it, with a fillable communication card in several languages.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "ready-plan-form",
      "name": "Make a Plan Form",
      "provider": "Ready.gov, US Department of Homeland Security",
      "url": "https://www.ready.gov/plan-form",
      "format": "interactive tool",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An online form for household members, schools, workplaces, contacts, meeting places, and medical details that produces a PDF. The page says the information is not saved, stored, or shared by any government agency.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "ready-kit",
      "name": "Build A Kit",
      "provider": "Ready.gov, US Department of Homeland Security",
      "url": "https://www.ready.gov/kit",
      "format": "checklist",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A basic supply list, including water, non-perishable food, a radio, flashlight, whistle, and manual can opener, with a printable checklist and advice to review the kit every year.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "ready-disability",
      "name": "People with Disabilities",
      "provider": "Ready.gov, US Department of Homeland Security",
      "url": "https://www.ready.gov/disability",
      "format": "guide",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Planning for medicines, powered medical equipment, mobility aids, service animals, spare batteries, and a support network, with captioned videos and downloadable guides.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "ready-financial",
      "name": "Financial Preparedness",
      "provider": "Ready.gov, US Department of Homeland Security",
      "url": "https://www.ready.gov/financial-preparedness",
      "format": "guide",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "What documents, insurance details, and cash to gather before a disaster, with the Emergency Financial First Aid Kit as a free PDF, including large print and translated versions.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "usfa-escape-plans",
      "name": "Home Fire Escape Plans",
      "provider": "US Fire Administration, Federal Emergency Management Agency",
      "url": "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/home-fire-escape-plans/",
      "format": "guide",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "How to find two ways out of every room, choose an outside meeting place, and run a home fire drill, with a printable escape grid in English and Spanish. It warns you may have less than two minutes to get out.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "uk-prepare",
      "name": "Get prepared for emergencies",
      "provider": "Prepare, UK Government",
      "url": "https://prepare.campaign.gov.uk/get-prepared-for-emergencies/",
      "format": "guide",
      "access": "open",
      "license": "Open Government Licence v3.0, except where otherwise stated",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "UK advice on a household emergency plan, meeting points, emergency contacts, and a supply list that says how much water to keep per person, with a downloadable plan document.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "canada-emergency-plan",
      "name": "Make an emergency plan",
      "provider": "Government of Canada",
      "url": "https://www.canada.ca/en/services/policing/emergencies/preparedness/get-prepared/make-plan.html",
      "format": "interactive tool",
      "access": "free",
      "license": "Government of Canada; Canada.ca terms allow non-commercial reproduction",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "An online planner the page says takes about 20 minutes and can be printed, covering evacuation routes, meeting places, contacts, childcare, medical details, pets, and local hazards.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "ctb-assessing-needs",
      "name": "Assessing Community Needs and Resources",
      "provider": "Community Tool Box, University of Kansas",
      "url": "https://ctb.ku.edu/en/assessing-community-needs-and-resources",
      "format": "toolkit",
      "access": "open",
      "license": "CC BY-NC-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Steps for learning a community's context, priorities, and assets through listening sessions, surveys, and asset mapping, with worked examples. The university also sells training, which this route does not need.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ctb-action-plans",
      "name": "Developing Strategic and Action Plans",
      "provider": "Community Tool Box, University of Kansas",
      "url": "https://ctb.ku.edu/en/developing-strategic-and-action-plans",
      "format": "toolkit",
      "access": "open",
      "license": "CC BY-NC-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Vision, mission, measurable objectives, strategies, and an action plan that says what happens, who does it, by when, with what resources, and who needs to know.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ctb-participation",
      "name": "Increasing Participation and Membership",
      "provider": "Community Tool Box, University of Kansas",
      "url": "https://ctb.ku.edu/en/increasing-participation-and-membership",
      "format": "toolkit",
      "access": "open",
      "license": "CC BY-NC-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "How to reach people beyond your usual circle, keep them involved, and remove barriers such as language, childcare, transport, and time.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ctb-meetings",
      "name": "Conducting Effective Meetings",
      "provider": "Community Tool Box, University of Kansas",
      "url": "https://ctb.ku.edu/en/table-of-contents/leadership/group-facilitation/main",
      "format": "guide",
      "access": "open",
      "license": "CC BY-NC-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Planning, setting up, running, and following up a meeting, with advice on agendas with time limits, notes, and handling disruption.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ctb-evaluating",
      "name": "Evaluating the Initiative",
      "provider": "Community Tool Box, University of Kansas",
      "url": "https://ctb.ku.edu/en/evaluating-initiative",
      "format": "toolkit",
      "access": "open",
      "license": "CC BY-NC-SA 4.0",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "A seven-step way to evaluate a community effort: who has a stake, what the effort is meant to do, which questions to ask, what evidence to gather, and how to use the results.",
      "sourceClass": "university",
      "checked": "2026-09-29"
    },
    {
      "id": "ada-accessible-events",
      "name": "A Planning Guide for Making Temporary Events Accessible to People with Disabilities",
      "provider": "ADA National Network",
      "url": "https://adata.org/guide/planning-guide-making-temporary-events-accessible-people-disabilities/",
      "format": "guide",
      "access": "free",
      "license": "Free to read; provider terms",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "Parking, routes, entrances, toilets, seating, and communication access such as interpreters and captioning for short-term events, as web pages, PDF, and large-print PDF.",
      "sourceClass": "federally funded disability information network",
      "checked": "2026-09-29"
    },
    {
      "id": "good-and-cheap",
      "name": "Good and Cheap: Eat Well on $4/Day",
      "provider": "Leanne Brown, via the Internet Archive",
      "url": "https://archive.org/details/GoodAndCheap",
      "format": "cookbook",
      "access": "open",
      "license": "CC BY-NC-SA 4.0, as stated in the book",
      "account": "none",
      "bandwidth": "medium",
      "download": true,
      "note": "A free cookbook written for people on US food-assistance budgets, with shopping tips, pantry basics, and low-cost recipes. This is version 1.1 from 2014, so its prices are 2014 prices. The author's own site now asks for a newsletter signup before the PDF.",
      "sourceClass": "open book",
      "checked": "2026-09-29"
    },
    {
      "id": "canada-budget-eating",
      "name": "Healthy eating on a budget",
      "provider": "Health Canada",
      "url": "https://www.canada.ca/en/health-canada/services/food-guide/eating-support/meal-planning-grocery-shopping/healthy-eating-budget.html",
      "format": "guide",
      "access": "free",
      "license": "Government of Canada; Canada.ca terms allow non-commercial reproduction",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Tips from Canada's food guide: shop from a list, compare unit prices, buy in season, use frozen and canned produce, cook with beans and lentils, and prepare food at home.",
      "sourceClass": "government health agency",
      "checked": "2026-09-29"
    },
    {
      "id": "canada-food-kitchen",
      "name": "Food guide kitchen",
      "provider": "Health Canada",
      "url": "https://www.canada.ca/en/health-canada/services/food-guide/eating-support/kitchen.html",
      "format": "recipe collection",
      "access": "free",
      "license": "Government of Canada; Canada.ca terms allow non-commercial reproduction",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Free recipes grouped by limits such as 10 ingredients or less, 30 minutes or less, freezer-friendly, and no-cook, with short articles on kitchen skills.",
      "sourceClass": "government health agency",
      "checked": "2026-09-29"
    },
    {
      "id": "eatwell-guide",
      "name": "The Eatwell Guide",
      "provider": "Office for Health Improvement and Disparities, UK Government",
      "url": "https://www.gov.uk/government/publications/the-eatwell-guide",
      "format": "guidance",
      "access": "open",
      "license": "Open Government Licence v3.0, except where otherwise stated",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "The UK's official food guide: a picture of a balanced diet by food group, with a booklet and the government dietary recommendations as PDFs.",
      "sourceClass": "government health agency",
      "checked": "2026-09-29"
    },
    {
      "id": "who-five-keys",
      "name": "Five keys to safer food manual",
      "provider": "World Health Organization",
      "url": "https://www.who.int/publications/i/item/9789241594639",
      "format": "manual",
      "access": "free",
      "license": "Copyright World Health Organization; free download",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "A 28-page manual from 2006 on five habits: keep clean, separate raw and cooked, cook thoroughly, keep food at safe temperatures, and use safe water and raw materials. Translations are offered.",
      "sourceClass": "intergovernmental health agency",
      "checked": "2026-09-29"
    },
    {
      "id": "epa-wasted-food",
      "name": "Preventing Wasted Food at Home",
      "provider": "US Environmental Protection Agency",
      "url": "https://www.epa.gov/recycle/preventing-wasted-food-home",
      "format": "guide",
      "access": "free",
      "license": "US government publication; no reuse terms stated on the page",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Shopping for the meals you will actually eat, storing produce, reading date labels, freezing, and using up leftovers.",
      "sourceClass": "government",
      "checked": "2026-09-29"
    },
    {
      "id": "musictheory-lessons",
      "name": "Lessons",
      "provider": "musictheory.net",
      "url": "https://www.musictheory.net/lessons",
      "format": "interactive lessons",
      "access": "free",
      "license": "Copyright musictheory.net, LLC; free to use online",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Short lessons from the staff, clefs, and note durations to scales, key signatures, intervals, and chords. The same company sells offline apps; this route uses only the free web lessons.",
      "sourceClass": "small company",
      "checked": "2026-09-29"
    },
    {
      "id": "musictheory-exercises",
      "name": "Exercises",
      "provider": "musictheory.net",
      "url": "https://www.musictheory.net/exercises",
      "format": "practice tool",
      "access": "free",
      "license": "Copyright musictheory.net, LLC; free to use online",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "Free drills for naming notes, key signatures, intervals, scales, and chords on the staff, keyboard, and fretboard, plus ear training, with a customizer that makes a fixed link to your own settings.",
      "sourceClass": "small company",
      "checked": "2026-09-29"
    },
    {
      "id": "chrome-music-lab",
      "name": "Chrome Music Lab",
      "provider": "Google Creative Lab",
      "url": "https://musiclab.chromeexperiments.com/",
      "format": "interactive tool",
      "access": "free",
      "license": "Free to use; code for several experiments released under Apache 2.0",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "Browser experiments for hearing rhythm, melody, and harmony, including Song Maker for making and sharing short songs. No account is needed; the Song Maker page recommends the Chrome browser.",
      "sourceClass": "company education project",
      "checked": "2026-09-29"
    },
    {
      "id": "musescore-handbook",
      "name": "MuseScore Studio Handbook",
      "provider": "MuseScore",
      "url": "https://handbook.musescore.org/",
      "format": "software guide",
      "access": "free",
      "license": "GPL v3 software; handbook license not stated",
      "account": "none",
      "bandwidth": "medium",
      "download": false,
      "note": "The manual for MuseScore Studio, free notation software for Windows, macOS, and Linux: setting up a score, entering notes and rests by keyboard or mouse, and playback. The program is a separate download.",
      "sourceClass": "open-source project",
      "checked": "2026-09-29"
    },
    {
      "id": "mt21c",
      "name": "Music Theory for the 21st-Century Classroom",
      "provider": "Robert Hutchinson, hosted by the University of Puget Sound",
      "url": "https://musictheory.pugetsound.edu/mt21c/MusicTheory.html",
      "format": "open textbook",
      "access": "open",
      "license": "GNU Free Documentation License",
      "account": "none",
      "bandwidth": "low",
      "download": false,
      "note": "A free online textbook on pitch, notation, rhythm, meter, scales, keys, intervals, and chords, with practice exercises after the main topics.",
      "sourceClass": "open book",
      "checked": "2026-09-29"
    },
    {
      "id": "mutopia",
      "name": "The Mutopia Project",
      "provider": "Mutopia Project volunteers",
      "url": "https://www.mutopiaproject.org/",
      "format": "sheet music library",
      "access": "open",
      "license": "Public domain or Creative Commons, stated on each piece",
      "account": "none",
      "bandwidth": "low",
      "download": true,
      "note": "About 2,100 volunteer-typeset pieces of classical music as printable PDF and MIDI files, which you can browse by instrument.",
      "sourceClass": "volunteer public-domain project",
      "checked": "2026-09-29"
    }
  ],
  "routes": [
    {
      "id": "learn-how",
      "title": "Build a learning system",
      "deck": "Turn study time into retrieval, feedback, reflection, and durable memory instead of a prettier pile of notes.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 3,
      "hours": 2,
      "access": "no-account",
      "artifact": "A one-page learning protocol, 20 retrieval prompts, and a two-week review calendar.",
      "prerequisites": "Choose one real topic you want to learn. No academic background is assumed.",
      "outcomes": [
        "Distinguish recognition from active recall.",
        "Plan spaced and interleaved practice.",
        "Use delayed self-testing to find weak knowledge.",
        "Revise a study system from evidence rather than mood."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write a 200-word learning history: what you tried, what lasted, and where attention or access became a barrier.",
          "evidence": "A baseline note with one target and one obstacle.",
          "resources": [
            "openlearn-learning"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the evidence-rated study recommendations and map them against UDL barriers that matter in your context.",
          "evidence": "A table linking at least four practices to your own study conditions.",
          "resources": [
            "ies-study-guide",
            "cast-udl"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Turn one short reading into ten answerable prompts. Close the source, retrieve, check, and repeat after forty-eight hours.",
          "evidence": "Ten prompts with first-try and delayed results.",
          "resources": [
            "learning-scientists",
            "anki-manual"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Assemble a weekly protocol with a start ritual, retrieval block, worked-example block, project block, and stop rule.",
          "evidence": "A schedule that fits your real week and names what gets dropped when time is tight.",
          "resources": [
            "openlearn-learning",
            "ies-study-guide"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Predict your score before a delayed quiz, compare prediction with performance, then revise the protocol.",
          "evidence": "A short calibration note and one documented change.",
          "resources": [
            "openlearn-learning",
            "learning-scientists"
          ]
        }
      ]
    },
    {
      "id": "statistics",
      "title": "Read data without being fooled",
      "deck": "Build statistical intuition, inspect public data, and make one honest chart with uncertainty and provenance.",
      "focus": "evidence",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A reproducible one-page data story with a chart, source note, uncertainty paragraph, and a list of checks.",
      "prerequisites": "Comfort with arithmetic. Coding is optional; a spreadsheet is enough.",
      "outcomes": [
        "Explain sampling, variation, association, and uncertainty in plain language.",
        "Trace a chart to its underlying dataset and definitions.",
        "Choose a chart that matches the question.",
        "State what the data cannot establish."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Use interactive probability examples to describe variation before calculating anything.",
          "evidence": "Three screenshots or sketches with a one-sentence interpretation each.",
          "resources": [
            "seeing-theory"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through selected OpenIntro chapters on data, sampling, probability, and confidence intervals.",
          "evidence": "A glossary of ten terms written without copying definitions.",
          "resources": [
            "openintro-stats"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Choose one FRED or Our World in Data series. Reproduce a summary, inspect units and missingness, and test a second time window.",
          "evidence": "A source log and two alternative chart views.",
          "resources": [
            "fred",
            "our-world-in-data"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the data story in a spreadsheet or with R. Include the dataset, transformations, chart, and plain-language result.",
          "evidence": "A file another person can rerun or audit.",
          "resources": [
            "r4ds",
            "data-gov",
            "world-bank-data"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Try to break your own conclusion: inspect the baseline, denominator, aggregation, time span, and plausible confounders.",
          "evidence": "An uncertainty paragraph and at least one softened or corrected sentence.",
          "resources": [
            "calling-bullshit",
            "openintro-stats"
          ]
        }
      ]
    },
    {
      "id": "writing",
      "title": "Write an evidence-based argument",
      "deck": "Move from a question to a defensible claim, source trail, complete draft, and revision memo.",
      "focus": "foundations",
      "level": "Beginner to intermediate",
      "weeks": 5,
      "hours": 4,
      "access": "no-account",
      "artifact": "A 1,200-word argument, annotated source log, and revision memo explaining the largest change.",
      "prerequisites": "A question you genuinely care about and access to a text editor.",
      "outcomes": [
        "Narrow a research question into a contestable thesis.",
        "Use sources as evidence rather than decoration.",
        "Signal uncertainty and counterarguments.",
        "Revise structure before polishing sentences."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Draft a question, audience, purpose, and provisional answer. Then list what evidence could prove you wrong.",
          "evidence": "A one-page argument brief.",
          "resources": [
            "purdue-owl"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Study genre, claims, evidence, citation, and research ethics in an open writing text.",
          "evidence": "Notes organized by decisions you must make, not chapter headings.",
          "resources": [
            "openstax-writing",
            "writing-commons"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Annotate three sources. For each, record the claim, evidence, limitation, useful passage, and relationship to the others.",
          "evidence": "Three source cards in Zotero, Hypothesis, or a local document.",
          "resources": [
            "zotero-quickstart",
            "hypothesis"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the full draft with a visible line of reasoning, linked evidence, and one serious counterargument.",
          "evidence": "A complete draft with citations and a bibliography.",
          "resources": [
            "purdue-owl",
            "openstax-writing"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Reverse-outline the draft, read it aloud, ask a reader to summarize the claim, and revise the structure first.",
          "evidence": "A revision memo naming what changed, why, and what remains uncertain.",
          "resources": [
            "unc-writing-center",
            "writing-commons"
          ]
        }
      ]
    },
    {
      "id": "accessible-web",
      "title": "Build an accessible website",
      "deck": "Learn the web by shipping a small site that works with keyboards, zoom, narrow screens, and assistive technology.",
      "focus": "build",
      "level": "Beginner",
      "weeks": 8,
      "hours": 6,
      "access": "mixed",
      "artifact": "A deployed single-page website, accessibility checklist, test notes, and known-limitations statement.",
      "prerequisites": "A computer capable of editing text files. No programming experience is required.",
      "outcomes": [
        "Use semantic HTML and resilient CSS.",
        "Test keyboard access, focus, reflow, contrast, and text alternatives.",
        "Interpret automated findings without treating them as proof.",
        "Publish and document a small web project."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete MDN getting-started material and hand-write a semantic page before adding styles.",
          "evidence": "A local HTML page with headings, landmarks, links, a list, and an image alternative.",
          "resources": [
            "mdn-learn"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through a foundations sequence while studying disability and barrier concepts alongside code.",
          "evidence": "A project plan that pairs each feature with an accessibility risk.",
          "resources": [
            "odin-foundations",
            "webaim-intro"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use only the keyboard, zoom to 200 percent, narrow the viewport, run Easy Checks, and inspect automated WAVE findings.",
          "evidence": "A test log separating observed barriers from automated warnings.",
          "resources": [
            "w3c-easy-checks",
            "wave"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the final page, include a skip link and visible focus, then deploy it with a documented source repository.",
          "evidence": "A live URL and source link.",
          "resources": [
            "github-pages",
            "freecodecamp"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Map the important findings to WCAG 2.2, fix what you can, and state what still needs screen-reader or user testing.",
          "evidence": "A concise conformance-not-claimed note and retest record.",
          "resources": [
            "wcag22",
            "w3c-easy-checks"
          ]
        }
      ]
    },
    {
      "id": "claim-investigation",
      "title": "Investigate a claim on the open web",
      "deck": "Trace a claim beyond the page that repeats it, locate the underlying evidence, and publish a calibrated conclusion.",
      "focus": "evidence",
      "level": "Beginner to intermediate",
      "weeks": 4,
      "hours": 3,
      "access": "no-account",
      "artifact": "An evidence dossier with a claim table, source chain, confidence statement, and correction history.",
      "prerequisites": "Bring one consequential but answerable claim. Avoid private allegations about individuals.",
      "outcomes": [
        "Use lateral reading before deep reading.",
        "Separate primary evidence, interpretation, reporting, and repetition.",
        "Locate canonical scholarly records and open copies.",
        "Express confidence without collapsing uncertainty into true or false."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write the claim exactly, identify who benefits if it spreads, and investigate the first source by opening new tabs.",
          "evidence": "A claim card with source, date, scope, and initial questions.",
          "resources": [
            "civic-online-reasoning",
            "web-literacy"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Learn the roles of journal directories, repository search, scholarly graphs, and DOI metadata.",
          "evidence": "A search plan naming which tool answers which question.",
          "resources": [
            "doaj",
            "core",
            "openalex",
            "crossref-search"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Trace one repeated statement to the earliest reachable evidence. Save an archived version and record every transformation.",
          "evidence": "A source-chain diagram with direct links.",
          "resources": [
            "internet-archive",
            "zotero-quickstart"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build a table of claim, evidence, source class, conflicts, limitations, and what would change your mind.",
          "evidence": "A shareable dossier whose citations open to the relevant evidence.",
          "resources": [
            "zotero-quickstart",
            "core"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask a devil’s advocate to find the strongest rival explanation, then search specifically for disconfirming evidence.",
          "evidence": "A revised confidence statement and a dated correction note.",
          "resources": [
            "civic-online-reasoning",
            "openalex"
          ]
        }
      ]
    },
    {
      "id": "climate",
      "title": "Understand climate evidence locally",
      "deck": "Connect physical mechanisms, observed records, model projections, uncertainty, and local decisions without confusing assessment with advocacy.",
      "focus": "science",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A local climate briefing with one observed trend, one regional projection, uncertainties, and clearly separated policy choices.",
      "prerequisites": "Basic graph reading. Choose a region you know.",
      "outcomes": [
        "Distinguish weather, climate, forcing, observation, projection, and scenario.",
        "Read confidence language and multiple lines of evidence.",
        "Use regional data without claiming street-level precision.",
        "Separate scientific findings from value-based policy choices."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Read NASA’s mechanism and evidence overview, then explain the greenhouse effect with a diagram and no borrowed sentences.",
          "evidence": "A one-page mechanism sketch with three evidence types.",
          "resources": [
            "nasa-climate"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the IPCC Synthesis Report headline findings and a relevant NOAA learning collection. Track confidence terms.",
          "evidence": "A table of finding, evidence type, confidence, and geographic scope.",
          "resources": [
            "ipcc-synthesis",
            "noaa-climate"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use the IPCC Atlas to compare your region across two warming levels. Cross-check one observed indicator with a public dataset.",
          "evidence": "Two exported views and a note on scale, scenario, and uncertainty.",
          "resources": [
            "ipcc-atlas",
            "owid-climate"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Build the briefing around one question that matters locally. Include a source appendix and a boundary between evidence and recommendations.",
          "evidence": "A two-page briefing or five-slide deck.",
          "resources": [
            "clean-collection",
            "noaa-climate"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Use En-ROADS to test policy combinations, then write why a simulator is a model for exploration rather than a forecast.",
          "evidence": "A sensitivity note naming at least three assumptions.",
          "resources": [
            "enroads",
            "ipcc-synthesis"
          ]
        }
      ]
    },
    {
      "id": "civics",
      "title": "Follow a public decision from rule to action",
      "deck": "Learn how law, regulation, agencies, courts, legislatures, data, and public participation connect in one real issue.",
      "focus": "public",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A two-page civic process map for one local or national issue, with primary sources and a concrete participation step.",
      "prerequisites": "Choose an issue and jurisdiction. This route teaches research, not legal advice.",
      "outcomes": [
        "Distinguish constitutions, statutes, regulations, cases, policies, and guidance.",
        "Find official legislative, regulatory, and court records.",
        "Identify the institution with authority over a question.",
        "Describe a participation route without overstating its likely effect."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Use an iCivics game or quest to model one branch or process. Write down where the simulation simplifies reality.",
          "evidence": "A process sketch and a list of three simplifications.",
          "resources": [
            "icivics"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Look up unfamiliar legal terms in Wex and read the governing primary text in LII.",
          "evidence": "A glossary linked to primary authority.",
          "resources": [
            "wex",
            "cornell-lii"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Trace a bill, rulemaking docket, or Supreme Court case through its official record and timeline.",
          "evidence": "A dated timeline with primary-source links.",
          "resources": [
            "congress",
            "regulations",
            "oyez"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Map who decides, who implements, who reviews, who is affected, and where public input is accepted. Add relevant Census context.",
          "evidence": "A process map with jurisdiction and uncertainty labels.",
          "resources": [
            "census-data",
            "cornell-lii"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Check whether each statement describes law, proposed law, policy, reporting, or opinion. Verify that the participation window is current.",
          "evidence": "A corrected map and a one-paragraph limits note.",
          "resources": [
            "congress",
            "regulations"
          ]
        }
      ]
    },
    {
      "id": "health-evidence",
      "title": "Read a health claim safely",
      "deck": "Understand study designs, search authoritative indexes, compare protocols with reports, and prepare better questions for a clinician.",
      "focus": "evidence",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A health-evidence brief with claim type, study design, absolute effects, limitations, conflicts, and questions for a clinician.",
      "prerequisites": "Choose a general health claim, not a personal diagnosis or treatment decision.",
      "outcomes": [
        "Evaluate who runs, funds, reviews, and updates health information.",
        "Distinguish anecdotes, observational studies, trials, and systematic reviews.",
        "Read absolute effects and reported harms.",
        "Know when online research must stop and professional care must begin."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete the MedlinePlus tutorial and apply its checklist to the first page making your chosen claim.",
          "evidence": "A completed checklist and a list of missing disclosures.",
          "resources": [
            "medlineplus-eval"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use Know the Science to review study design, journal articles, risk, and health news.",
          "evidence": "A one-page study-design comparison in your own words.",
          "resources": [
            "nccih-science",
            "cdc-health-literacy"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Find the claim in PubMed, identify publication type, then compare a trial publication with its ClinicalTrials.gov record when possible.",
          "evidence": "A search log with protocol, outcome, and reporting differences.",
          "resources": [
            "pubmed",
            "clinicaltrials-basics"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the evidence brief. Include absolute numbers, population, duration, harms, funding, and what the studies do not answer.",
          "evidence": "A brief that avoids giving medical advice.",
          "resources": [
            "cochrane-evidence",
            "pubmed"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask whether the evidence is current, directly applicable, and strong enough for action. Convert uncertainties into questions for a qualified clinician.",
          "evidence": "A final section titled Questions I cannot answer online.",
          "resources": [
            "medlineplus-eval",
            "nccih-science"
          ]
        }
      ]
    },
    {
      "id": "world-history",
      "title": "Build history from primary sources",
      "deck": "Move between survey, archive, context, provenance, interpretation, and silence to create a small digital exhibit.",
      "focus": "public",
      "level": "Beginner to intermediate",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A mini digital exhibit with five primary sources, captions, provenance, a guiding question, and an interpretation note.",
      "prerequisites": "Choose a place, period, exchange, migration, technology, or idea rather than an entire civilization.",
      "outcomes": [
        "Distinguish primary sources from later interpretation.",
        "Describe provenance, audience, purpose, and archival context.",
        "Compare sources that do not tell the same story.",
        "Identify absences and limits in digitized collections."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Choose a World History Commons module and write the historical question before reading the supplied interpretation.",
          "evidence": "A question, provisional timeline, and list of source types you hope to find.",
          "resources": [
            "world-history-commons"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the relevant OpenStax survey sections, recording every place where the narrative compresses disagreement or uncertainty.",
          "evidence": "A context sheet with dates, actors, terms, and open questions.",
          "resources": [
            "openstax-world-history"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Collect five items from at least two archives. Record creator, date, repository, rights, description, and why it matters.",
          "evidence": "A provenance table and downloaded thumbnails or stable links.",
          "resources": [
            "loc-primary",
            "dpla-primary",
            "world-digital-library"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Arrange the sources into a digital exhibit, local document, or Smithsonian collection. Write captions that distinguish observation from inference.",
          "evidence": "A public or local exhibit with complete credits.",
          "resources": [
            "smithsonian-lab"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Search a different archive or language frame for what the first collection omitted. Revise the interpretation and add a silence note.",
          "evidence": "A paragraph on archival limits and one changed caption.",
          "resources": [
            "europeana",
            "world-history-commons"
          ]
        }
      ]
    },
    {
      "id": "language",
      "title": "Start a language through use",
      "deck": "Build structural intuition, daily contact, listening, retrieval, and a small piece of speech without pretending an app streak is fluency.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 8,
      "hours": 3,
      "access": "no-account",
      "artifact": "A three-minute recording or live conversation, a personal phrasebook, and 30 spaced prompts drawn from real use.",
      "prerequisites": "Choose a language with a Language Transfer or comparable beginner resource and some accessible audio.",
      "outcomes": [
        "Notice recurring sound and grammar patterns.",
        "Build phrases from meaning instead of isolated word lists.",
        "Use learner-generated retrieval prompts.",
        "Review a recording to choose the next practice target."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Complete the first Language Transfer sessions. Pause, answer aloud, and write only the patterns you can explain.",
          "evidence": "A one-page pattern map and ten usable phrases.",
          "resources": [
            "language-transfer"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use Wiktionary and Tatoeba to inspect pronunciation, inflection, and example sentences. Treat community examples as leads, not unquestionable authority.",
          "evidence": "A phrasebook with source links and corrections.",
          "resources": [
            "wiktionary",
            "tatoeba"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Shadow short audio, then retrieve phrases from meaning. Put only tested, personally useful prompts into Anki or paper cards.",
          "evidence": "Five short shadowing sessions and 30 prompts.",
          "resources": [
            "librivox",
            "easy-languages",
            "anki-manual"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Record a three-minute self-introduction, story, or explanation. For a reading route, adapt or translate a short open StoryWeaver text where licensing permits.",
          "evidence": "A dated recording or text that can be repeated later.",
          "resources": [
            "storyweaver",
            "language-transfer"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Transcribe what you actually said, mark gaps, get correction from a trusted speaker or reference, and record it again after one week.",
          "evidence": "Version two plus a list of the next five patterns to practice.",
          "resources": [
            "tatoeba",
            "wiktionary"
          ]
        }
      ]
    },
    {
      "id": "science-inquiry",
      "title": "Run a small scientific investigation",
      "deck": "Turn curiosity into a testable question, model, observation plan, data record, and replication note.",
      "focus": "science",
      "level": "Beginner",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A short investigation report with question, model, method, data, uncertainty, and a replication or parameter-change result.",
      "prerequisites": "Choose a safe question that can be explored with a simulation, public data, observation, or low-risk household materials.",
      "outcomes": [
        "Separate a question, hypothesis, model, method, observation, and conclusion.",
        "Change one variable while recording enough detail to repeat the work.",
        "Use visual and numerical representations together.",
        "Revise a model when results do not match prediction."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Explore one PhET simulation without instructions, then state a mechanism you think it represents and a question the controls can test.",
          "evidence": "A prediction and a diagram of the model.",
          "resources": [
            "phet"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read a matching OpenStax section or MIT course note. Identify where the simulation simplifies the real system.",
          "evidence": "A concept map with assumptions and omitted factors.",
          "resources": [
            "openstax-science",
            "mit-ocw"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Follow a BioInteractive or Science Buddies investigation, preserving raw observations and changing one parameter.",
          "evidence": "A dated method and data table.",
          "resources": [
            "hhmi",
            "science-buddies"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Repeat the work independently or contribute a documented observation through a citizen-science project.",
          "evidence": "A report with data, graph, uncertainty, and enough method for another person to try.",
          "resources": [
            "zooniverse",
            "inaturalist"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Compare prediction with result, search for an alternative explanation, and run one replication or sensitivity check.",
          "evidence": "A revised model and a paragraph distinguishing correlation from cause.",
          "resources": [
            "phet",
            "hhmi"
          ]
        }
      ]
    },
    {
      "id": "family-inquiry",
      "title": "Run a family curiosity studio",
      "deck": "Pair reading, questions, observation, making, and explanation in short sessions that end with something a child can show or tell.",
      "focus": "family",
      "level": "Ages 5 to 12 with an adult",
      "weeks": 4,
      "hours": 2,
      "access": "mixed",
      "artifact": "A family curiosity portfolio with one story response, one investigation, one creative project, and one child-led explanation.",
      "prerequisites": "An adult should preview resources, choose age-appropriate material, and keep personal information out of public projects.",
      "outcomes": [
        "Turn a child’s question into a small learning sequence.",
        "Alternate screen use with talk, drawing, movement, and making.",
        "Offer accessible formats and genuine choices.",
        "Use explanation and creation as evidence of understanding."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Let the child choose a StoryWeaver book or Khan Academy Kids topic. Ask what they notice, wonder, and want to make.",
          "evidence": "A question board with the child’s words preserved.",
          "resources": [
            "storyweaver",
            "khan-kids"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Explore a Smithsonian or PBS collection together. Stop every few minutes for prediction, drawing, or retelling.",
          "evidence": "Three child-generated notes, sketches, or questions.",
          "resources": [
            "smithsonian-lab",
            "pbs-learningmedia"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Use a PhET simulation or Code.org activity, then repeat the idea away from the screen with objects, movement, or paper.",
          "evidence": "One screen activity and one physical analogue.",
          "resources": [
            "phet",
            "code-org"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Create a Scratch story, paper exhibit, model, or translated open story that answers the original question.",
          "evidence": "A project the child can explain without the adult taking over.",
          "resources": [
            "scratch",
            "storyweaver"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Ask the child to teach the idea back, choose a favorite piece, and name a next question. Use Bookshare or another accessible format where needed.",
          "evidence": "A short audio, caption, or reflection in the child’s preferred mode.",
          "resources": [
            "bookshare",
            "global-digital-library"
          ]
        }
      ]
    },
    {
      "id": "repair",
      "title": "Repair something you own",
      "deck": "Find out what is wrong with one broken thing you own, check that it is safe and allowed to open, fix it with help, and write the guide you could not find.",
      "focus": "build",
      "level": "Beginner",
      "weeks": 4,
      "hours": 3,
      "access": "no-account",
      "artifact": "A repair record for one item: a step-by-step guide with photos, the fault you found, parts, cost and time, and the barrier if it could not be fixed, written in the fields of the Open Repair Data Standard.",
      "prerequisites": "One broken item you own, a basic screwdriver set, and a phone camera. Never open anything while it is plugged in. Take mains-powered items, high-wattage appliances, and anything with a swollen or damaged battery to a repair event rather than opening them alone. Recall and warranty sources cover the US and the EU; check local rules elsewhere.",
      "outcomes": [
        "Check recalls, warranty rights, and safety limits before opening anything.",
        "Describe a fault precisely and test one cause at a time.",
        "Use community repair data to see which faults are common for an item like yours.",
        "Record a repair, fixed or not, so another person can repeat it or learn from it."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write a fault card: what the item is, what it used to do, what it does now, and when that changed. Search the recall database for the brand and model, and read what your warranty or local repair law lets you do before you open anything.",
          "evidence": "A fault card with make, model, age, symptom, recall result, and warranty status.",
          "resources": [
            "cpsc-recalls",
            "ftc-warranties",
            "eu-right-to-repair"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read how volunteer repairers classify the faults of your kind of item and the first checks repair groups suggest for it. Write down three possible causes.",
          "evidence": "Three likely causes, ranked, each with a test you can run without buying parts.",
          "resources": [
            "open-repair-insights",
            "restart-top-tips",
            "repair-cafe-tips"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Take the item to a free repair event, or, if it runs on batteries or low voltage, run your tests at home. Unplug it, photograph every screw and connector before you undo it, and test one cause at a time.",
          "evidence": "Photos in order, with a line under each test saying what you did and what you saw.",
          "resources": [
            "repair-cafe-faq",
            "restart-repair-options"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the repair as a guide another person could follow, including the steps that did not work. Add a record in the standard's fields: product category, brand, year of manufacture, problem, repair status (fixed, repairable, or end of life), and the barrier if it could not be fixed.",
          "evidence": "A guide with photos and a completed repair record, whether or not the item works again.",
          "resources": [
            "open-repair-standard",
            "open-repair-insights"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "After two weeks of normal use, check whether the repair held. Show your guide to one person who repairs things, such as a volunteer at the event, and ask what they would have done differently. Then read one account of repair restrictions and name the barrier that stopped you or nearly did.",
          "evidence": "A dated follow-up note: whether the repair held, the repairer's comment, and the barrier in the standard's terms (parts unavailable or too expensive, no way to open, no repair information, lack of equipment, too worn out).",
          "resources": [
            "ftc-nixing-the-fix",
            "eu-right-to-repair",
            "open-repair-standard"
          ]
        }
      ]
    },
    {
      "id": "read-the-claims",
      "title": "Read a product label and its claims",
      "deck": "Read one product's label line by line, test its environmental and ethical claims against the rules regulators use, and say plainly what holds up.",
      "focus": "evidence",
      "level": "Beginner",
      "weeks": 4,
      "hours": 3,
      "access": "no-account",
      "artifact": "A claim audit for one product: the label read line by line, each claim archived and tested against published regulator principles, the evidence found and missing, and a plain verdict for each claim with a confidence level.",
      "prerequisites": "One packaged product you buy, with the pack in hand, and the company's website. The route teaches you to read claims; it does not certify products or decide whether a company broke the law. Sources cover the US, the UK, and the EU.",
      "outcomes": [
        "Read serving size and percent Daily Value on a food label.",
        "Tell a specific, checkable claim from a vague one like 'green' or 'eco-friendly'.",
        "Check whether a seal or ecolabel has been assessed by someone other than the seller.",
        "Judge a net zero claim by its interim targets, its use of credits, and whether a transition plan is public."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Photograph every side of the pack. Copy each claim word for word and sort it: required disclosure (ingredients, nutrition panel), specific claim, vague claim, or seal. Read the nutrition panel with the FDA guide; if your label is not from the US, use the guide for the ideas only. Then look the product up in Open Food Facts and note where the record and your pack disagree.",
          "evidence": "A claim inventory with photos, every claim sorted into one of the four kinds, and a list of differences from the database record.",
          "resources": [
            "fda-nutrition-label",
            "open-food-facts"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read two regulators' tests for environmental claims: the CMA's six principles and the FTC's summary of the Green Guides. Add the European Commission's questions and answers, which also cover social claims and claims based on offsetting.",
          "evidence": "A one-page checklist merging the tests, with the source of each line.",
          "resources": [
            "cma-green-claims-code",
            "ftc-green-guides-summary",
            "eu-ecgt-qa"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Test each claim with your checklist. Look up every seal in EPA's list of assessed ecolabels. For a comparison such as '30 percent less plastic', ask less than what, and measured how. Read about the company from outside its own site, and archive every company page you cite.",
          "evidence": "A claim table: claim, test applied, what you found, what is missing, and an archived link.",
          "resources": [
            "epa-ecolabel-recommendations",
            "calling-bullshit",
            "civic-online-reasoning",
            "internet-archive"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Find one climate claim the company makes about itself, such as net zero by a given year or carbon neutral, and test it against the UN expert group's recommendations and the EU rules on future and offset-based claims. Write up the whole audit.",
          "evidence": "A two-page audit with a verdict for each claim (supported, unsupported, or cannot tell), the evidence behind it, and your confidence.",
          "resources": [
            "un-hleg-net-zero",
            "eu-ecgt-qa",
            "cma-green-claims-code"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Give the audit to one person who buys the product and ask which verdict they think is too harsh or too kind. Search for evidence against your strongest verdict, then open your archived pages again to see whether the company changed anything.",
          "evidence": "A revised audit with a dated change note and three questions you would put to the company.",
          "resources": [
            "web-literacy",
            "internet-archive",
            "civic-online-reasoning"
          ]
        }
      ]
    },
    {
      "id": "money-basics",
      "title": "Run your own money without a salesperson",
      "deck": "Build a budget from what you really spend, check your credit report, and learn how fees and sales pay work, so you can question anyone who sells you a financial product.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A personal money file: one month of real spending, a budget built from it, a credit report checklist with any dispute drafted, a fee comparison with a graph, and a question sheet for anyone who sells you a financial product.",
      "prerequisites": "This route teaches money literacy only. It is not financial, tax, or legal advice, and it recommends no product or provider. Keep your figures on paper or on your own device; the only place it asks you to enter personal details is your country's official free credit report service. If you are behind on rent, energy, or other essential bills, or a debt collector is pressing you, talk to a free debt advice service where you live before you start. Sources cover the US, the UK, and Canada; check which rules apply to you.",
      "outcomes": [
        "Build a budget from a record of real spending rather than guesses.",
        "Read a credit report line by line and draft a dispute for an error.",
        "Calculate what an ongoing fee costs over twenty years and check a published figure against its source.",
        "Ask how a financial professional is paid, check their registration, and name the pressure signs in a sales pitch."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Write one line in your own words stating the limit of this route: it teaches literacy, not advice. Then list every payment in and out for the last month from statements and receipts, and mark each one as a need or a want.",
          "evidence": "A one-month spending record, on paper or your own device, with needs and wants marked.",
          "resources": [
            "fcac-budget",
            "cfpb-your-money-your-goals"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use the goal, income, and spending worksheets to build next month's budget from your record. Look up a plain answer to the one money question that worries you most, such as bank fees, card interest, or debt collection.",
          "evidence": "A budget for next month with one goal, one question answered with its source, and a review date.",
          "resources": [
            "cfpb-your-money-your-goals",
            "ask-cfpb",
            "fcac-budget"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Get your free credit reports through the official route for your country; in the US that is the one site the FTC names. Read every account line and mark anything you do not recognize. If a line is wrong, draft a dispute using the CFPB steps.",
          "evidence": "A checklist of what you checked and found, kept apart from the report itself, and a drafted dispute if one is needed.",
          "resources": [
            "ftc-free-credit-reports",
            "cfpb-credit-reports"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Graph $100,000 growing at 4 percent a year for 20 years with no fee, a 0.25 percent fee, and a 1 percent fee. Read FINRA's one-line fee example and the SEC bulletin it cites, and work out which comparison its $28,000 figure describes. Finish with a question sheet for anyone selling you a financial product: how are you paid, where are you registered, and what do you earn if I choose this.",
          "evidence": "A graph with your working, a short note on the $28,000 figure, and a one-page question sheet naming the registration check for your country.",
          "resources": [
            "desmos",
            "finra-fees",
            "sec-fees-bulletin",
            "finra-professionals"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Two weeks into the new budget, compare actual spending with the plan and change at least one line. Then take a real sales call, email, or advert about money that reached you and mark every pressure sign in it.",
          "evidence": "A revised budget with a dated note on what changed, and one annotated sales message.",
          "resources": [
            "ftc-avoid-scams",
            "fca-scams",
            "cfpb-your-money-your-goals"
          ]
        }
      ]
    },
    {
      "id": "privacy-basics",
      "title": "Protect your accounts and your privacy",
      "deck": "Write a security plan for your own life, secure the email account that can reset all the others, learn to spot phishing, and ask one organization what it holds about you.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 5,
      "hours": 2,
      "access": "no-account",
      "artifact": "A personal security plan: a threat model, an account map with recovery options checked, two-factor on your email and one other key account, a phishing log, and a request to one organization for the data it holds about you.",
      "prerequisites": "This route teaches everyday security and privacy literacy. It is not professional security help or legal advice. Never write real passwords, recovery codes, or security answers in your route notes; record only that they exist and where they are kept. If you think a partner, family member, or employer is watching your devices, changing settings can alert them, so talk to a support service you trust before you start. Sources come from the US and the UK; the data request stage depends on the law where you live.",
      "outcomes": [
        "Write a threat model: what you protect, from whom, and how much effort it is worth.",
        "Set up unique passwords and two-factor authentication with recovery you can actually use.",
        "Recognize phishing and know the first steps after an account is taken over.",
        "Ask an organization for the personal data it holds about you, where your law gives you that right."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Answer the six security plan questions for your own life. List the accounts you use and draw which ones can reset which, starting with your main email.",
          "evidence": "A one-page threat model and an account map with names only, no passwords.",
          "resources": [
            "eff-ssd-security-plan",
            "ncsc-cyber-aware"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Learn how passwords get guessed and reused, how password managers and passphrases work, and how the kinds of two-factor authentication compare. The Open University course goes deeper if you want it.",
          "evidence": "A table comparing SMS codes, authenticator apps, security keys, and passkeys for your own accounts, with your choice for each and the reason.",
          "resources": [
            "eff-ssd-passwords",
            "eff-ssd-2fa",
            "openlearn-cyber-security"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Give your email a long unique password, turn on two-factor, store the backup codes on paper somewhere safe, and confirm the recovery phone and address are current. Do the same for one bank or work account. Read the hacked-account steps now, before you need them, and log every suspicious message you receive for one week.",
          "evidence": "A dated checklist per account (done, not offered, or postponed) with no secrets in it, and a phishing log naming the warning sign in each message.",
          "resources": [
            "cisa-secure-our-world",
            "ftc-phishing",
            "ncsc-hacked-account"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Review app permissions and tracking settings on your phone and main browser, and remove what you do not need. Then write to one organization that holds data about you and ask for a copy. In the UK this is a subject access request; elsewhere, check whether your law gives the same right before you send it.",
          "evidence": "A before-and-after permissions list, and the request, sent or drafted, with the date a reply is due.",
          "resources": [
            "ftc-online-tracking",
            "security-in-a-box",
            "ico-subject-access"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Three weeks after the practice stage, test your recovery by signing in to each key account on another device using only what you stored. Read the organization's reply if one came. Show your phishing log to one other person, ask which messages would have fooled them, and revise the plan.",
          "evidence": "A revised plan with a dated note on what failed, and a record of what the organization sent or that the deadline passed with no reply.",
          "resources": [
            "eff-ssd-security-plan",
            "ico-subject-access",
            "ncsc-cyber-aware"
          ]
        }
      ]
    },
    {
      "id": "first-program",
      "title": "Write a first program that does a real chore",
      "deck": "Learn enough Python to take one repetitive computer task off your hands, then prove it by running the program on real work for two weeks.",
      "focus": "build",
      "level": "Beginner",
      "weeks": 6,
      "hours": 4,
      "access": "no-account",
      "artifact": "A working Python script that does one real chore, a README that says what it changes and how to undo it, and a two-week run log compared with the time the chore took by hand.",
      "prerequisites": "A computer where you can install Python (Windows, macOS, or Linux) and one computer chore you repeat at least weekly. No programming experience is assumed.",
      "outcomes": [
        "Break a manual task into steps precise enough for a computer to follow.",
        "Use variables, conditions, loops, functions, and files in Python.",
        "Read an error message and find the line and the cause it points to.",
        "Test a program on copies before it touches real files, and document what it changes."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Watch the CS50x Week 0 lecture to see how a task becomes precise step-by-step instructions. Choose one computer chore you repeat at least weekly, such as renaming files, sorting a downloads folder, or totalling a column, and write it as numbered steps. Install Python using the first Python for Everybody lesson.",
          "evidence": "The chore written as numbered steps, how often you do it, minutes per run, and the output of a first line of Python on your own computer.",
          "resources": [
            "cs50x",
            "py4e"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through the Python for Everybody lessons on variables, conditionals, functions, loops, strings, and files. Type every example yourself and write down what you expect before you run it. Use the official tutorial's chapters on control flow and on input and output as a second explanation.",
          "evidence": "A folder of short scripts, one per lesson, each with a comment recording your prediction and the actual result.",
          "resources": [
            "py4e",
            "python-tutorial"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Do the Carpentries episodes on lists, loops, analyzing multiple files, and making choices. The next day, redo two exercises without looking at your earlier answers. Keep a list of every error message you meet and look each one up in the tutorial's chapter on errors and exceptions.",
          "evidence": "Exercise answers with first-try and next-day results, and an error list saying what each message meant and what fixed it.",
          "resources": [
            "swc-python",
            "python-tutorial"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write the program for your chore using the Automate the Boring Stuff chapters on reading and writing files and on organizing files. Run it only on a copied test folder until it works, never on the originals.",
          "evidence": "The script, a README saying what it does, how to run it, what it changes or deletes, and how to undo that, plus a before-and-after listing of the test folder.",
          "resources": [
            "automate-boring",
            "python-tutorial"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Use the program for the real chore for two weeks. Add at least one safety check from the Carpentries episode on defensive programming, such as an assertion or a dry-run option that only prints what it would do. Log every run.",
          "evidence": "A run log with dates and time taken against your manual baseline, one failure or edge case you found, and the fix.",
          "resources": [
            "swc-python",
            "automate-boring"
          ]
        }
      ]
    },
    {
      "id": "map-your-place",
      "title": "Map your own streets in OpenStreetMap",
      "deck": "Survey a few blocks you know on foot, add what is missing to the open map anyone can use, and check back to see how your edits hold up.",
      "focus": "public",
      "level": "Beginner",
      "weeks": 4,
      "hours": 3,
      "access": "mixed",
      "artifact": "Published OpenStreetMap edits for a few blocks near you, with a dated survey record, a list of changesets and their sources, and a two-week follow-up note.",
      "prerequisites": "A web browser, an area you can walk safely, and a free OpenStreetMap account before the Make stage. A phone helps but is not required; paper works.",
      "outcomes": [
        "Explain who may use OpenStreetMap data and which sources you may and may not copy from.",
        "Add points, lines, and areas with suitable tags in the iD editor.",
        "Collect ground observations on paper or phone and turn them into edits.",
        "Write changeset comments that let another mapper check your work."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Read the copyright page, then look at your area on openstreetmap.org. Pick a study area of a few blocks and list what the map shows, what looks wrong, and what is missing.",
          "evidence": "A boundary sketch of your area and a list of at least ten features to check in person.",
          "resources": [
            "osm-copyright",
            "learnosm-beginner"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through the LearnOSM beginner chapters on the website, the iD editor, and notes. Create your account and practise adding a point, a line, and an area, then undo each one before saving anything.",
          "evidence": "A tagging sheet with the tags you will use for ten kinds of feature in your area, checked against the guide.",
          "resources": [
            "learnosm-beginner",
            "osm-copyright"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Print a Field Papers atlas of your area and walk it, or use StreetComplete on an Android phone. Record only what anyone can see from public space, such as shops, paths, benches, crossings, and entrances. Do not record people or private details.",
          "evidence": "A dated survey record with at least 20 observations, each tied to a place on the atlas or in the app.",
          "resources": [
            "field-papers",
            "streetcomplete"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Enter your survey in iD in small changesets, each with a comment saying what you changed and that your source is your own survey. Where you are unsure, leave a map note instead of guessing.",
          "evidence": "A list of changeset links with their comments, plus links to any notes you opened.",
          "resources": [
            "learnosm-beginner",
            "field-papers"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "After two weeks, open each changeset and the history of each feature you edited. Answer any comments, walk the area again to confirm what you mapped, and ask your local section of the community forum to look over one changeset.",
          "evidence": "A follow-up note listing replies, later edits by other mappers, and at least one correction you made.",
          "resources": [
            "osm-community",
            "learnosm-beginner"
          ]
        }
      ]
    },
    {
      "id": "grow-food",
      "title": "Grow some food in a small space",
      "deck": "Match a few crops to the light, water, and containers you actually have, grow them to a first harvest, and keep a record that makes the next season better.",
      "focus": "science",
      "level": "Beginner",
      "weeks": 10,
      "hours": 2,
      "access": "no-account",
      "artifact": "A growing record for at least three crops from sowing to first harvest, with a site sketch, dated observations, harvest counts or weights, and a plan for the next season.",
      "prerequisites": "A spot with some direct sun, such as a balcony, windowsill, doorstep, or corner of a yard, a few containers with drainage holes or a small bed, and a small budget for seed and potting mix. No gardening experience is assumed.",
      "outcomes": [
        "Measure the light, water, and space a site offers and choose crops that fit it.",
        "Choose containers and potting mix, and check ground soil for lead before growing food in it.",
        "Sow, water, and feed on a schedule, and record what happens.",
        "Identify a pest or problem before deciding what to do about it."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Watch your space on one sunny day and note where direct sun falls in the morning, at midday, and in late afternoon. Note water access, wind, and weight limits if it is a balcony. Find your local frost dates or rainy season from a local extension office or weather service.",
          "evidence": "A site sketch with hours of direct sun, the water source, and the dates of your growing season.",
          "resources": [
            "fao-garden",
            "osu-containers"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read both container guides and the FAO chapters on soil and on starting a garden. Choose three to five crops that suit your light: leaves and roots tolerate some shade, while fruiting crops such as tomatoes and peppers need six to eight hours of direct sun. If you plan to grow in ground soil, read the EPA lead guidance and get the soil tested first.",
          "evidence": "A crop plan listing each crop, its container size, sowing date, and expected days to harvest, with a note on soil safety.",
          "resources": [
            "osu-containers",
            "rhs-containers",
            "epa-garden-lead"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Sow seeds or set out seedlings. Check the containers every day or two, water when the top of the mix feels dry, and write down what you did and what you saw.",
          "evidence": "A dated log, kept at least twice a week, with germination counts, watering, feeding, and weather.",
          "resources": [
            "fao-garden",
            "osu-containers"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Grow the crops to a first harvest. Photograph or sketch each crop weekly. When a pest or problem appears, identify it before you treat anything, for example by comparing it with iNaturalist observations from your area.",
          "evidence": "The growing record: weekly images or sketches, harvest counts or weights, and a note on each problem and what you did about it.",
          "resources": [
            "inaturalist",
            "rhs-containers"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Two weeks after the first harvest, compare your crop plan with what happened. Decide which crops earned their space and what you would change about light, container size, watering, or timing, and check your reasons against the guides.",
          "evidence": "A one-page season review with three specific changes for the next planting.",
          "resources": [
            "fao-garden",
            "osu-containers",
            "rhs-containers"
          ]
        }
      ]
    },
    {
      "id": "ai-literacy",
      "title": "Understand what AI systems can and cannot do",
      "deck": "Learn how AI systems are built from data, test one you already use against answers you can check, and write down when you will and will not rely on it.",
      "focus": "evidence",
      "level": "Beginner",
      "weeks": 8,
      "hours": 5,
      "access": "no-account",
      "artifact": "A one-page use card for one AI system you rely on, backed by a 15-input test log, a failure table using the NIST risk names, and a two-week recheck.",
      "prerequisites": "Access to at least one AI system you already use, such as a chatbot, a translation tool, or photo search. No math or programming is required.",
      "outcomes": [
        "Explain in plain words how machine learning systems learn from examples and why they can be confident and wrong.",
        "Design checks with known answers to test an AI system's output.",
        "Name specific failure types, such as confabulation and harmful bias, using the NIST categories.",
        "Write a rule for when an AI output must be checked before you act on it."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "List every AI system you meet in one week, such as recommendations, spam filters, autocomplete, the face recognition that opens your phone, and chatbots. For each, write what you think it does, what data it learned from, and one way it could fail you. Then read the first Elements of AI chapter and revise the list.",
          "evidence": "An inventory of at least eight systems, with a before-and-after note on what you counted as AI.",
          "resources": [
            "elements-of-ai"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through the six chapters of Elements of AI, from problem solving and probability to machine learning, neural networks, and implications. Then read the Calling Bullshit lecture on big data and its readings on bias in language data and the Google Flu Trends failure.",
          "evidence": "A one-page explainer in your own words of how a system learns from examples, where its training data comes from, and why it can be wrong with confidence.",
          "resources": [
            "elements-of-ai",
            "calling-bullshit"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Write 15 inputs for one system you use where you can check the answer yourself: a fact from a source you trust, a sum, a request for a citation, a question about your own street or town, and a task in a second language. Leave out anything personal. Record each output, mark it right, wrong, or impossible to verify, and name the failure type for each wrong one using the NIST profile.",
          "evidence": "A test log of 15 inputs with checked answers, the system's outputs, a verdict for each, and a failure type for each wrong answer.",
          "resources": [
            "nist-genai-profile",
            "elements-of-ai"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Write a one-page use card for the system: what it is for, how you tested it, where it failed, who could be harmed by those failures, and your rule for when you will and will not rely on it. Check the card against the NIST characteristics of trustworthy AI and say which ones your tests could not assess.",
          "evidence": "A use card that cites your test log for every claim it makes and names what you could not test.",
          "resources": [
            "nist-ai-rmf",
            "nist-genai-profile"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "After two weeks, rerun five of your test inputs and compare the outputs. Search the AI Incident Database for two reported incidents involving the same kind of system and note what went wrong and who was affected. Revise your rule.",
          "evidence": "A recheck note with the rerun results, two incident summaries, and one documented change to your rule.",
          "resources": [
            "ai-incident-database",
            "nist-ai-rmf"
          ]
        }
      ]
    },
    {
      "id": "emergency-plan",
      "title": "Make a household emergency plan",
      "deck": "Write down where everyone meets, who calls whom, and what you carry when power, water, or phones fail, then test it with a drill.",
      "focus": "family",
      "level": "Beginner",
      "weeks": 4,
      "hours": 2,
      "access": "no-account",
      "artifact": "A written household emergency plan, a supply kit with a dated inventory, a checklist of copied key documents, and a drill log.",
      "prerequisites": "At least one other person from your household. Some supplies cost money, so the kit can be built over several weeks. This route teaches planning and supplies only. It does not teach first aid or CPR: learn those on a certified in-person course from your national Red Cross or Red Crescent society, St John Ambulance, or another accredited trainer.",
      "outcomes": [
        "Name the emergencies most likely where you live and what each would cut off: power, water, roads, or phones.",
        "Record contacts, meeting places, and each person's needs, including medicines, mobility aids, pets, and languages, in one plan everyone can read.",
        "Assemble a supply kit sized to your household, with a list of what expires and when.",
        "Run a drill, time it, and change the plan based on what went wrong."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "List the three emergencies most likely where you live, using your local or national emergency agency, and what each would cut off. Then list everyone in the household and what they depend on each day: medicines, powered equipment, mobility aids, pets, childcare, and language.",
          "evidence": "A hazard list of three events and a household needs list with one line per person or animal.",
          "resources": [
            "ready-plan",
            "uk-prepare",
            "ready-disability"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the plan and supply guidance from at least two countries. Note where they agree, where they differ, for example on how much water to store, and whether a difference comes from climate, housing, or local services.",
          "evidence": "A comparison table with at least six rows and a note on which guidance you will follow and why.",
          "resources": [
            "ready-kit",
            "uk-prepare",
            "canada-emergency-plan"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Draw a floor plan with two ways out of every room and an outside meeting place. Press the smoke alarm test button and run a fire drill with everyone at home. Then test the contact plan: each person reaches the out-of-area contact by text or call.",
          "evidence": "A drill log with the time it took to get everyone out, who could not be reached, and one fix for each problem.",
          "resources": [
            "usfa-escape-plans",
            "ready-plan"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Fill in a household plan with the Ready.gov form, the Canadian online planner, or the UK plan document, and print a copy for each adult. Build the kit, label each item with its expiry date, and put copies of key documents in one folder. A first aid kit is not first aid training: write into the plan the name of a certified in-person course near you.",
          "evidence": "A printed plan, a kit inventory with expiry dates, a document checklist, and the name of a certified first aid course.",
          "resources": [
            "ready-plan-form",
            "canada-emergency-plan",
            "uk-prepare",
            "ready-kit",
            "ready-financial"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Four weeks later, ask each household member, without notes, where the meeting places are and who the out-of-area contact is. Check the kit against the needs list for anything missed, such as spare hearing aid batteries or pet food. Set dates to review the plan and replace what expires.",
          "evidence": "A short review note with the quiz results, two changes made, and the next review date written on a calendar.",
          "resources": [
            "ready-disability",
            "ready-kit"
          ]
        }
      ]
    },
    {
      "id": "community-project",
      "title": "Run a small project with your neighbours",
      "deck": "Pick one thing your street or block wants, plan it with the people it affects, run it, and write down honestly what happened.",
      "focus": "public",
      "level": "Beginner",
      "weeks": 8,
      "hours": 3,
      "access": "no-account",
      "artifact": "An asset map of your area, a one-page action plan with names and dates, notes from a neighbour meeting, and a one-page evaluation of what changed.",
      "prerequisites": "A place where you live or spend time and at least two neighbours willing to talk. Choose something small and legal you can finish in a few weeks, such as a shared tool shelf, a clean-up, or a street meal. Check what permission your council, landlord, or housing association needs before you use shared or public space.",
      "outcomes": [
        "Map the skills, places, and groups already in your area before deciding what is missing.",
        "Choose a goal from what neighbours say they want, not only from what you want.",
        "Write an action plan that says who does what, by when, and with what resources.",
        "Run a meeting and an event that more people can reach and take part in, then measure what happened against the plan."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Walk your street or block and list what is already there: people with skills, meeting places, groups, and shops. Add three figures about your area from the census or your national statistics office. Ask at least five neighbours what they would change and what they would help with.",
          "evidence": "An asset map, a short data note with sources, and five neighbour answers written in their own words.",
          "resources": [
            "ctb-assessing-needs",
            "census-data"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Use the planning toolkit to write a vision, a mission, and two or three objectives that say how much will change and by when. Use the participation toolkit to list what could keep people out, such as language, childcare, transport, and time.",
          "evidence": "A vision and mission of one paragraph, measurable objectives, and a barrier list with one response to each barrier.",
          "resources": [
            "ctb-action-plans",
            "ctb-participation"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Hold one short neighbour meeting with a written agenda, a time limit for each item, and someone taking notes. Pick a place people can reach and get into, and ask beforehand what access needs people have.",
          "evidence": "The agenda, notes with each decision and who owns it, and a list of who came and who you still need to hear from.",
          "resources": [
            "ctb-meetings",
            "ada-accessible-events"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Turn the meeting's decisions into an action plan: each step, who does it, by when, what it needs, and who must be told. Run the project and keep a simple log of what you did, who took part, and what it cost.",
          "evidence": "A one-page action plan and a dated project log.",
          "resources": [
            "ctb-action-plans",
            "ctb-participation",
            "ada-accessible-events"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Two weeks after the project, compare what happened with each objective. Ask the same five neighbours, plus anyone who joined, what worked and what should change. Decide whether to continue, change, or stop.",
          "evidence": "A one-page evaluation with results against each objective, neighbour feedback, and one written decision about next steps.",
          "resources": [
            "ctb-evaluating",
            "ctb-assessing-needs"
          ]
        }
      ]
    },
    {
      "id": "cook-on-a-budget",
      "title": "Cook good food on a small budget",
      "deck": "Plan a week of meals, shop by unit price, cook in batches, handle food safely, and waste less, starting from a free cookbook written for tight budgets.",
      "focus": "foundations",
      "level": "Beginner",
      "weeks": 5,
      "hours": 3,
      "access": "no-account",
      "artifact": "A costed one-week meal plan and shopping list, five recipes you cooked with the cost per serving, and a pantry list for next month.",
      "prerequisites": "Access to a kitchen with at least one way to heat food and somewhere to store it. This route teaches cooking and shopping, not medical or diet advice. If you have a health condition, allergy, or special diet, ask a doctor or registered dietitian how general guidance applies to you.",
      "outcomes": [
        "Track what you spend on food and what you throw away for one week.",
        "Plan meals around low-cost staples and leftovers, and compare prices by unit rather than by package.",
        "Cook, store, and reheat food following the five keys to safer food.",
        "Work out the cost per serving of meals you cooked and change the plan from those numbers."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "For one week, log every food purchase, every meal, and everything thrown away. Note the tools, storage space, and cooking time you actually have.",
          "evidence": "A seven-day food log with the total spent and a list of wasted items.",
          "resources": [
            "epa-wasted-food",
            "good-and-cheap"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Read the Good and Cheap sections on eating and shopping well and on pantry basics, and the Canadian budget tips. Use the Eatwell Guide to check that a week of meals covers each food group, then find two or three low-cost foods for each group.",
          "evidence": "A table of food groups with two or three low-cost foods for each and the source for each choice.",
          "resources": [
            "good-and-cheap",
            "canada-budget-eating",
            "eatwell-guide"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Cook three recipes from Good and Cheap or the Canadian recipe collection, making at least one as a double batch. Follow the five keys: keep clean, separate raw and cooked, cook thoroughly, keep food at safe temperatures, and use safe water and raw materials. Label and date the leftovers.",
          "evidence": "Three cooking notes with ingredients, time taken, what you would change, and how leftovers were stored.",
          "resources": [
            "good-and-cheap",
            "canada-food-kitchen",
            "who-five-keys"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Plan one week of meals that reuse ingredients across dishes. Write a shopping list, compare unit prices in the shop, and record what you paid. Cook the week and work out the cost per serving of five dishes.",
          "evidence": "A costed meal plan, a shopping list checked against the receipt, and five recipes with cost per serving.",
          "resources": [
            "canada-budget-eating",
            "good-and-cheap",
            "epa-wasted-food"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Compare this week with the first week's log: money spent, food wasted, and meals cooked at home. Keep the three dishes that worked best, drop what did not, and write a pantry list for next month.",
          "evidence": "A two-week comparison table and a pantry list with prices.",
          "resources": [
            "epa-wasted-food",
            "eatwell-guide"
          ]
        }
      ]
    },
    {
      "id": "make-music",
      "title": "Read and make simple music",
      "deck": "Learn to read rhythm and pitch on the staff, hear what you read, and write a short melody with chords that someone else can play.",
      "focus": "build",
      "level": "Beginner",
      "weeks": 8,
      "hours": 3,
      "access": "no-account",
      "artifact": "An 8 to 16 bar melody with chord symbols in standard notation, a recording or share link, and a practice log with ear-training scores.",
      "prerequisites": "A device with a web browser and sound. An instrument helps but is not required, because the browser tools and notation software play back what you write. No music reading is assumed.",
      "outcomes": [
        "Read note names in treble and bass clef and count rhythms in simple time signatures.",
        "Build major and minor scales, intervals, and triads, and recognise some intervals by ear.",
        "Write a short melody over a chord progression and enter it in notation software.",
        "Track practice scores over time and return to weak spots after a delay."
      ],
      "stages": [
        {
          "id": "orient",
          "label": "Orient",
          "task": "Spend an hour making rhythms and melodies by ear in Chrome Music Lab. Then write down what you can already do, such as reading notes, keeping a beat, or singing in tune, and what you want to be able to make.",
          "evidence": "A short starting note and one shared Song Maker piece.",
          "resources": [
            "chrome-music-lab",
            "musictheory-lessons"
          ]
        },
        {
          "id": "study",
          "label": "Study",
          "task": "Work through the lessons on the staff, clefs, note and rest durations, measures, and time signatures, then scales, key signatures, intervals, and triads. Turn to the open textbook when you want more examples or a slower explanation.",
          "evidence": "A one-page summary in your own words with a hand-written example of each term.",
          "resources": [
            "musictheory-lessons",
            "mt21c"
          ]
        },
        {
          "id": "practice",
          "label": "Practice",
          "task": "Do ten minutes of note naming and interval ear training on most days, recording your score each time. Once a week, open the simplest piece you can find for your instrument or voice, clap the rhythm, and name the notes in the first eight bars.",
          "evidence": "A practice log with daily scores and four weekly reading notes.",
          "resources": [
            "musictheory-exercises",
            "mutopia",
            "learning-scientists"
          ]
        },
        {
          "id": "make",
          "label": "Make",
          "task": "Choose a key and a progression of four chords. Write an 8 to 16 bar melody over it, first on paper or in Song Maker, then enter it in MuseScore Studio with chord symbols and play it back to check each note.",
          "evidence": "A notation file or PDF of the melody with chord symbols, plus a recording of it played back or a share link.",
          "resources": [
            "musescore-handbook",
            "chrome-music-lab",
            "musictheory-lessons"
          ]
        },
        {
          "id": "review",
          "label": "Review",
          "task": "Two weeks after finishing the melody, retake the note and interval exercises without warming up and compare with your first scores. Put any notes or intervals you still miss into spaced prompts, on paper cards or in Anki. Play or sing the melody from the page and fix any spot where the notation does not match what you meant.",
          "evidence": "A table of first and delayed scores, a set of prompts for weak spots, and a revised melody with one written note on the change.",
          "resources": [
            "musictheory-exercises",
            "anki-manual",
            "musescore-handbook"
          ]
        }
      ]
    }
  ],
  "libraryGroups": [
    {
      "group": "Structured open study",
      "note": "Full courses and textbooks that can anchor a route, not merely decorate a bookmarks folder.",
      "ids": [
        "openlearn",
        "mit-ocw",
        "open-textbook-library",
        "libretexts",
        "oer-commons",
        "cs50x",
        "openstax-writing",
        "openintro-stats"
      ]
    },
    {
      "group": "Practice, projects, and simulations",
      "note": "Learning becomes visible when a learner must retrieve, test, build, or explain.",
      "ids": [
        "phet",
        "desmos",
        "hhmi",
        "exercism",
        "carpentries",
        "seeing-theory",
        "scratch",
        "science-buddies"
      ]
    },
    {
      "group": "Research discovery and source keeping",
      "note": "Use indexes to locate records, then read the actual source and preserve enough provenance to return.",
      "ids": [
        "doaj",
        "core",
        "openalex",
        "openalex-api",
        "crossref-search",
        "eric",
        "pubmed",
        "zotero-quickstart",
        "worldcat"
      ]
    },
    {
      "group": "Public data and evidence",
      "note": "Primary public data still requires definitions, denominator checks, and honest uncertainty.",
      "ids": [
        "our-world-in-data",
        "fred",
        "world-bank-data",
        "data-gov",
        "census-data",
        "ipcc-atlas"
      ]
    },
    {
      "group": "Civics, law, and public process",
      "note": "These sources help locate official records. They do not replace jurisdiction-specific professional advice.",
      "ids": [
        "icivics",
        "cornell-lii",
        "wex",
        "oyez",
        "congress",
        "regulations"
      ]
    },
    {
      "group": "History, museums, and archives",
      "note": "A digitized collection is a sample shaped by preservation, description, rights, language, and institutional choices.",
      "ids": [
        "world-history-commons",
        "loc-primary",
        "dpla-primary",
        "smithsonian-lab",
        "world-digital-library",
        "europeana"
      ]
    },
    {
      "group": "Health and scientific evidence",
      "note": "Use these to ask better questions. Do not use a route or database as a diagnosis or treatment recommendation.",
      "ids": [
        "medlineplus-eval",
        "nccih-science",
        "pubmed",
        "clinicaltrials-basics",
        "openwho",
        "cdc-health-literacy",
        "cochrane-evidence"
      ]
    },
    {
      "group": "Languages and accessible reading",
      "note": "Free access and open licensing are different. Eligibility rules also matter for accessible copyrighted books.",
      "ids": [
        "language-transfer",
        "tatoeba",
        "wiktionary",
        "librivox",
        "storyweaver",
        "global-digital-library",
        "bookshare"
      ]
    },
    {
      "group": "Children and family learning",
      "note": "Preview material, minimize data collection, and end sessions with talk, movement, drawing, making, or rest.",
      "ids": [
        "khan-kids",
        "pbs-learningmedia",
        "storyweaver",
        "smithsonian-lab",
        "phet",
        "code-org",
        "scratch",
        "bookshare"
      ]
    }
  ]
};

  L.curriculumDemo = DATA;

  // Repair the old safety copy at the source used by the live shelves. Lawful access,
  // provenance, and device safety are part of learning. Malware popups are not a rite of passage.
  if (L.openUniversity) {
    L.openUniversity.cautions = [
      'For lawful free access, start with public libraries, interlibrary loan, open textbooks, public-domain collections, institutional repositories, author-posted manuscripts, and publisher audit options. Avoid deceptive download buttons and sites that hide provenance or rights.',
      'Free to read is not automatically open to copy, adapt, or redistribute. Check the license on the specific item, and preserve creator, source, and license information in anything you make.',
      'Opinion, error, and uneven evidence run through educational media. Label perspective, follow citations to primary material, compare serious alternatives, and record corrections instead of treating any channel as a neutral oracle.',
      'Health, legal, safety, and financial material can support better questions, not personalized professional decisions. Stop and seek qualified help when the stakes exceed a learning exercise.',
      'Watching can orient you. Durable learning usually requires retrieval, practice, feedback, a made artifact, and delayed review.'
    ];
    const byId = Object.create(null);
    DATA.resources.forEach(function(resource){ byId[resource.id] = resource; });
    const existing = new Set();
    (L.openUniversity.beyond || []).forEach(function(group){
      (group.items || []).forEach(function(item){ existing.add(String(item.n || '').toLowerCase()); });
    });
    const extra = DATA.libraryGroups.map(function(group){
      return {
        group: group.group,
        note: group.note,
        items: group.ids.map(function(id){ return byId[id]; }).filter(Boolean).filter(function(resource){
          const key = resource.name.toLowerCase();
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        }).map(function(resource){
          return {n:resource.name,u:resource.url,note:resource.note};
        })
      };
    }).filter(function(group){ return group.items.length; });
    L.openUniversity.beyond = (L.openUniversity.beyond || []).concat(extra);
  }

  const host = document.createElement('section');
  host.className = 'curriculum-demo';
  host.id = 'study-routes';
  host.setAttribute('aria-label','Guided study routes');
  // Local change 2026-07-27: the page was restructured and the .atlas section retired, so the
  // bundled anchors no longer place this correctly. An explicit slot wins when present.
  // Re-running apply_kosplora_round.py will overwrite this file and revert this edit.
  const slot = document.getElementById('study-routes-slot');
  const atlas = document.querySelector('.atlas');
  const openUniversity = document.getElementById('openuni');
  if (slot && slot.parentNode) slot.parentNode.insertBefore(host, slot);
  else if (atlas && atlas.parentNode) atlas.parentNode.insertBefore(host, atlas);
  else if (openUniversity && openUniversity.parentNode) openUniversity.parentNode.insertBefore(host, openUniversity.nextSibling);
  else return;

  const style = document.createElement('style');
  style.textContent = `
    .curriculum-demo{margin:0 0 1.5rem;overflow:hidden}
    .cd-head{padding:1.25rem 1.25rem 0.75rem;background:linear-gradient(135deg,color-mix(in srgb, var(--accent) 10%, transparent),transparent 48%)}
    
    .cd-head h2{font-family:Georgia,"Times New Roman",serif;font-size:1.75rem;line-height:1.16;margin:0.25rem 0 0.25rem}
    .cd-head>p{max-width:46rem;color:var(--muted);margin:0.25rem 0}
    
    
    
    
    
    
    
    .cd-count{padding:0.5rem 1rem;margin:0;color:var(--muted);font-size:0.86rem}.cd-count b{color:var(--ink)}

    /* A route row is a table line, not a card. Twelve cards was 1,400px of near-identical
       blocks under a headline promising "not a list you scroll". Twelve rows is one screen,
       and the numbers align so they can actually be compared down the column. */
    /* Front matter. One place to begin, then an index. Twelve equal options behind a filter
       row gave a reader nothing to hold: no default, no grouping, no scent. */
    .cd-start{margin:1.5rem 0 0;padding:1.25rem 1.25rem 1rem;background:var(--surface);
      border-left:3px solid var(--accent);box-shadow:var(--shadow-md)}
    .cd-start-lead{margin:0 0 0.25rem;font:700 0.75rem/1.3 ui-monospace,Menlo,Consolas,monospace;
      letter-spacing:0.08em;color:var(--accent)}
    .cd-start h3{margin:0 0 0.5rem;font-family:Georgia,"Times New Roman",serif;font-size:1.75rem;
      font-weight:750;letter-spacing:-0.01em}
    .cd-start-why{margin:0 0 0.75rem;max-width:60ch;color:var(--muted)}
    .cd-start-cost{margin:0 0 1rem;max-width:60ch;font-size:0.86rem}
    .cd-start-go{font:650 0.86rem/1 inherit;padding:0.75rem 1.25rem;min-height:44px;cursor:pointer;
      border:0;border-radius:8px;background:var(--accent);color:var(--bg);box-shadow:var(--shadow-sm)}
    .cd-start-note{margin:0.75rem 0 0;font-size:0.75rem;color:var(--hint);max-width:60ch}

    .cd-index{margin:2rem 0 0}
    .cd-index h3{margin:0 0 0.25rem;font-family:Georgia,"Times New Roman",serif;font-size:1.35rem;font-weight:750}
    .cd-index-sub{margin:0 0 1rem;color:var(--muted);font-size:0.86rem;max-width:68ch}
    .cd-group{margin:0 0 1rem}
    .cd-group h4{margin:0 0 0.25rem;font:700 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      letter-spacing:0.08em;color:var(--hint)}
    .cd-ix{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
    .cd-ix li{border-bottom:1px solid var(--line)}
    .cd-ix-row{display:grid;grid-template-columns:1fr auto auto;gap:0 1.25rem;align-items:baseline;
      width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:0.5rem 0.25rem;min-height:44px}
    .cd-ix-row:hover,.cd-ix-row:focus-visible{background:var(--surface)}
    .cd-ix-name{font-size:1rem;font-weight:600;color:var(--ink)}
    .cd-ix-cost,.cd-ix-total{font:500 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      font-variant-numeric:tabular-nums;color:var(--hint);white-space:nowrap}
    .cd-ix-total{color:var(--ink);font-weight:700;min-width:3.25rem;text-align:right}
    @media (max-width:620px){.cd-ix-row{grid-template-columns:1fr auto}.cd-ix-cost{display:none}}
    /* the full cards live below the index, reached by picking a row */
    .cd-routes{margin-top:2rem}
    .cd-count{display:none}
    .cd-route{border:0;border-top:1px solid var(--line);border-radius:0;background:none;box-shadow:none;margin:0}
    .cd-route:last-of-type{border-bottom:1px solid var(--line)}
    .cd-route>summary{display:grid;grid-template-columns:1fr auto auto auto;gap:0 1.25rem;
      align-items:baseline;padding:0.5rem 0.25rem;cursor:pointer;list-style:none;min-height:44px}
    .cd-route>summary::-webkit-details-marker{display:none}
    .cd-route>summary:hover,.cd-route>summary:focus-visible{background:var(--surface)}
    .cd-route[open]>summary{background:var(--surface)}
    .cd-r-name{font-family:Georgia,"Times New Roman",serif;font-size:1.12rem;font-weight:700}
    .cd-r-time,.cd-r-total,.cd-r-prog{font:500 0.75rem/1.4 ui-monospace,Menlo,Consolas,monospace;
      font-variant-numeric:tabular-nums;color:var(--hint);white-space:nowrap}
    .cd-r-total{color:var(--ink);font-weight:700;min-width:3.5rem;text-align:right}
    .cd-r-prog{min-width:2.5rem;text-align:right}
    .cd-r-deck{margin:0 0 0.75rem;color:var(--muted);max-width:68ch}
    @media (max-width:620px){
      .cd-route>summary{grid-template-columns:1fr auto;gap:0 0.75rem}
      .cd-r-time{grid-column:1;color:var(--hint)}
    }
    .cd-routes{display:block;gap:0}
    .cd-route,.cd-plate,.cd-fact{box-shadow:var(--shadow-md);background:var(--surface)}
    /* One level only: a stage, a tag and a resource live ON the route card, not above it. */
    .cd-route *,.cd-plate *,.cd-fact *{box-shadow:none}
    .cd-stage{box-shadow:none;border:0;border-top:1px solid var(--line)}
    
    .cd-resource{box-shadow:none}
    .cd-route[open]{box-shadow:var(--shadow-lg)}
    .cd-stage{box-shadow:var(--shadow-sm)}
    .cd-head h2{font-weight:750;letter-spacing:-0.01em}
    
    .cd-method{margin:0.75rem 0 0;font:500 0.75rem/1.5 ui-monospace,Menlo,Consolas,monospace;color:var(--hint);letter-spacing:0.04em}
    .cd-plate svg{width:100%;height:auto;display:block;overflow:visible}
    .cd-plate-tick{font-size:0.64rem;fill:var(--hint);text-anchor:middle}
    .cd-plate-axis{font-size:0.75rem;fill:var(--muted);text-anchor:middle;letter-spacing:0.04em}
    .cd-plate-mark{cursor:pointer}
    .cd-plate-mark text{font-size:0.75rem;fill:var(--ink);dominant-baseline:middle}
    .cd-plate-mark:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .cd-routes{display:grid;gap:0.75rem;padding:0 1rem 1rem}
    .cd-route{border:1px solid var(--line);border-radius:8px;background:var(--bg);overflow:hidden}
    .cd-route[hidden]{display:none}
    .cd-route>summary{list-style:none;cursor:pointer;padding:0.75rem 1rem;display:grid;grid-template-columns:1fr auto;gap:0.25rem 0.75rem;min-height:58px;align-items:center}
    .cd-route>summary::-webkit-details-marker{display:none}
    .cd-route>summary:hover{background:color-mix(in srgb, var(--accent) 18%, transparent)}
    
    
    
    .cd-progress progress{width:6rem;height:.45rem;accent-color:var(--accent)}
    .cd-body{border-top:1px solid var(--line);padding:1rem}
    .cd-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.5rem 1rem;margin:0 0 0.75rem}
    .cd-fact{padding:0.5rem 0.75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
    .cd-fact b{display:block;color:var(--ink);font-size:0.75rem}.cd-fact span{color:var(--muted);font-size:0.75rem}
    .cd-outcomes{margin:0.25rem 0 1rem;padding-left:1.25rem;color:var(--muted);font-size:0.86rem}.cd-outcomes li{margin:0.25rem 0}
    .cd-stages{display:grid;gap:0.5rem}
    .cd-stage{border:1px solid var(--line);border-radius:8px;padding:0.75rem 0.75rem;background:var(--surface)}
    .cd-stage-head{display:flex;gap:0.75rem;align-items:flex-start}.cd-stage-head label{display:flex;gap:0.5rem;align-items:flex-start;cursor:pointer;flex:1}
    .cd-stage-head input{width:1.15rem;height:1.15rem;margin-top:0.25rem;accent-color:var(--accent)}
    .cd-stage-name{font:700 .7rem/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1em;color:var(--accent)}
    .cd-stage-task{display:block;color:var(--ink);font-size:0.86rem;line-height:1.45;margin-top:0.25rem}
    .cd-evidence{margin:0.5rem 0;color:var(--muted);font-size:0.75rem}.cd-evidence b{color:var(--ink)}
    .cd-resources{list-style:none;margin:0.5rem 0 0;padding:0;display:grid;gap:0.5rem}
    .cd-resource{padding:0.5rem 0;border-top:1px solid var(--line)}
    .cd-resource:first-child{border-top:none}.cd-resource a{color:var(--ink);font-weight:650;text-decoration:none}.cd-resource a:hover{text-decoration:underline;color:var(--accent)}
    .cd-provider{color:var(--ochre);font-size:0.75rem}.cd-resource p{margin:0.25rem 0;color:var(--muted);font-size:0.75rem;line-height:1.4}
    .cd-tags{display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.25rem}/* 525 outlined pills, nested five and six boxes deep, was a chip wall: the first tell on the
       house anti-slop list, shipped while the type scale was being measured. Metadata is not a
       button and does not need a border to be read. Plain text, separated, in the source ink. */
    .cd-tag{border:0;border-radius:0;padding:0;color:var(--hint);font:500 0.64rem/1.4 ui-monospace,Menlo,Consolas,monospace}
    .cd-tags{display:flex;flex-wrap:wrap;gap:0 0.75rem;margin-top:0.25rem}
    .cd-tags .cd-tag+.cd-tag{position:relative;padding-left:0.75rem}
    .cd-tags .cd-tag+.cd-tag::before{content:" b7";position:absolute;left:0;color:var(--line)}
    .cd-tag.open{color:var(--bd-hi-fg);background:var(--bd-hi-bg)}
    .cd-actions{display:flex;justify-content:space-between;gap:0.75rem;align-items:center;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--line)}
    .cd-reset{min-height:44px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--muted);padding:0.5rem 0.75rem;cursor:pointer}.cd-reset:hover{color:var(--ink);border-color:var(--accent)}
    .cd-local{color:var(--hint);font-size:0.75rem}.cd-empty{padding:1rem;color:var(--muted);border:1px dashed var(--line);border-radius:8px}
    .cd-note{padding:0.75rem 1rem;border-top:1px solid var(--line);color:var(--hint);font-size:0.75rem;margin:0}
    @media(max-width:680px){.cd-route>summary{grid-template-columns:1fr}.cd-facts{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const RES = Object.create(null);
  DATA.resources.forEach(function(resource){ RES[resource.id] = resource; });
  const KEY = 'kosplora.curriculum.progress.v1';
  let progress = readStore();
  let search = '';
  let hours = 'all';
  let access = 'all';
  let focus = 'all';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function readStore(){
    try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return value && typeof value === 'object' ? value : {}; }
    catch (_) { return {}; }
  }
  function writeStore(){ try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} }
  function stepKey(route,stage){ return route.id + ':' + stage.id; }
  function completed(route){ return route.stages.filter(function(stage){ return !!progress[stepKey(route,stage)]; }).length; }
  function resourceTags(resource){
    const tags = [resource.format, resource.access === 'open' ? 'open license' : resource.access === 'free' ? 'free access' : 'access limits'];
    if (resource.account === 'none') tags.push('no account');
    else if (resource.account === 'optional') tags.push('account optional');
    else if (resource.account === 'eligibility') tags.push('eligibility rule');
    else tags.push('account needed');
    if (resource.bandwidth === 'low') tags.push('low bandwidth');
    if (resource.download) tags.push('downloadable');
    return tags;
  }
  function resourceHTML(id){
    const r = RES[id];
    if (!r) return '';
    return '<li class="cd-resource"><a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.name)+'</a> <span class="cd-provider">'+esc(r.provider)+'</span>'+
      '<p>'+esc(r.note)+'</p><div class="cd-tags">'+resourceTags(r).map(function(tag){ return '<span class="cd-tag'+(tag==='open license'?' open':'')+'">'+esc(tag)+'</span>'; }).join('')+'</div></li>';
  }
  function stageHTML(route,stage){
    const key = stepKey(route,stage), checked = !!progress[key];
    return '<section class="cd-stage"><div class="cd-stage-head"><label><input type="checkbox" data-cd-step="'+esc(key)+'" '+(checked?'checked':'')+'><span><span class="cd-stage-name">'+esc(stage.label)+'</span><span class="cd-stage-task">'+esc(stage.task)+'</span></span></label></div>'+
      '<p class="cd-evidence"><b>Evidence of progress:</b> '+esc(stage.evidence)+'</p><ul class="cd-resources">'+stage.resources.map(resourceHTML).join('')+'</ul></section>';
  }

  function routeHTML(route){
    const done = completed(route), percent = Math.round(done / route.stages.length * 100);
    return '<details class="cd-route" data-route="'+esc(route.id)+'" data-hours="'+route.hours+'" data-access="'+esc(route.access)+'" data-focus="'+esc(route.focus)+'">'+
      '<summary>'+
      '<span class="cd-r-name">'+esc(route.title)+'</span>'+
      '<span class="cd-r-time">'+route.weeks+'w · '+route.hours+'h/wk</span>'+
      '<span class="cd-r-total">'+(route.weeks*route.hours)+'h</span>'+
      '<span class="cd-r-prog">'+done+'/5</span>'+
      '</summary>'+
      '<div class="cd-body"><p class="cd-r-deck">'+esc(route.deck)+'</p><div class="cd-facts"><div class="cd-fact"><b>Start with</b><span>'+esc(route.prerequisites)+'</span></div><div class="cd-fact"><b>Finish with</b><span>'+esc(route.artifact)+'</span></div></div>'+
      '<div class="cd-stage-name">What you will be able to do</div><ul class="cd-outcomes">'+route.outcomes.map(function(item){return '<li>'+esc(item)+'</li>';}).join('')+'</ul>'+
      '<div class="cd-stages">'+route.stages.map(function(stage){return stageHTML(route,stage);}).join('')+'</div>'+
      '<div class="cd-actions"><span class="cd-local">'+percent+'% complete · stored only in this browser</span><button type="button" class="cd-reset" data-cd-reset="'+esc(route.id)+'">Reset this route</button></div></div></details>';
  }
  function optionHTML(value,label,current){
    return '<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(label)+'</option>';
  }
  function focusOptions(){
    const labels = {all:'All routes',foundations:'Foundations',evidence:'Evidence literacy',build:'Build something',public:'Public life',science:'Science',family:'Family'};
    return Object.keys(labels).map(function(id){return optionHTML(id,labels[id],focus);}).join('');
  }
  // Rebuilt 2026-07-28 from the information architecture rather than the styling. The page was
  // twelve equal options behind a filter row, which is a stall by Hick's law and carries no
  // information scent: nothing told a reader where to begin or what was here. Now it reads as
  // front matter: what this is, one route to start with and why, then a grouped index of the
  // rest. Diataxis separates the layers that were previously stacked flat: these routes are
  // tutorials, the shelves below are reference, the ranker is the explanation of the method.
  const FOCUS_ORDER = ['foundations','evidence','science','public','build','family'];
  const FOCUS_LABEL = {foundations:'Foundations',evidence:'Evidence literacy',science:'Science',
                       public:'Public life',build:'Build something',family:'Family'};
  const START_ID = 'learn-how';

  function startHTML(){
    const r = DATA.routes.find(function(x){ return x.id === START_ID; }) || DATA.routes[0];
    if (!r) return '';
    return '<section class="cd-start" aria-labelledby="cd-start-h">'
      + '<p class="cd-start-lead">Start here</p>'
      + '<h3 id="cd-start-h">' + esc(r.title) + '</h3>'
      + '<p class="cd-start-why">' + esc(r.deck) + '</p>'
      + '<p class="cd-start-cost"><b>' + r.weeks + ' weeks</b> at about ' + r.hours
      + ' hours a week. You finish with ' + esc(r.artifact.charAt(0).toLowerCase() + r.artifact.slice(1)) + '</p>'
      + '<button type="button" class="cd-start-go" data-goto="' + esc(r.id) + '">Open this route</button>'
      + '<p class="cd-start-note">It is the shortest route here, and the method it teaches is the one every other route uses.</p>'
      + '</section>';
  }

  function indexHTML(){
    const groups = FOCUS_ORDER
      .map(function(f){ return {f: f, rows: DATA.routes.filter(function(r){ return r.focus === f; })}; })
      .filter(function(g){ return g.rows.length; });
    return '<section class="cd-index" aria-labelledby="cd-index-h">'
      + '<h3 id="cd-index-h">Every route</h3>'
      + '<p class="cd-index-sub">' + DATA.routes.length + ' routes, each ending in something another person can look at. '
      + 'Weeks and hours are what the route asks of you.</p>'
      + groups.map(function(g){
          return '<div class="cd-group"><h4>' + esc(FOCUS_LABEL[g.f] || g.f) + '</h4>'
            + '<ul class="cd-ix">' + g.rows.map(function(r){
                return '<li><button type="button" class="cd-ix-row" data-goto="' + esc(r.id) + '">'
                  + '<span class="cd-ix-name">' + esc(r.title) + '</span>'
                  + '<span class="cd-ix-cost">' + r.weeks + 'w &middot; ' + r.hours + 'h/wk</span>'
                  + '<span class="cd-ix-total">' + (r.weeks * r.hours) + 'h</span>'
                  + '</button></li>';
              }).join('') + '</ul></div>';
        }).join('')
      + '</section>';
  }

  function shellHTML(){
    return '<header class="cd-head"><h2>' + esc(DATA.title) + '</h2>'
      + '<p>' + esc(DATA.dek) + '</p>'
      + '<p class="cd-method">' + DATA.method.sequence.join(' → ') + '</p></header>'
      + startHTML() + indexHTML()
      + '<div class="cd-count" id="cd-count"></div>'
      + '<div class="cd-routes" id="cd-routes">' + DATA.routes.map(routeHTML).join('') + '</div>'
      + '<p class="cd-note"><b>Limits.</b> ' + esc(DATA.method.reads) + ' '
      + esc(DATA.method.access) + ' ' + esc(DATA.method.safety) + '</p>';
  }
  host.innerHTML = shellHTML();

  // Both the start button and every index row are ways in, so one handler serves them.
  function gotoRoute(ids){
    const list = String(ids).split(',');
    let first = null;
    list.forEach(function(id){
      const card = host.querySelector('.cd-route[data-route="' + id + '"]');
      if (!card) return;
      card.hidden = false; card.open = true;
      if (!first) first = card;
    });
    if (!first) return;
    first.scrollIntoView({block:'start'});
    const sum = first.querySelector('summary'); if (sum) sum.focus();
  }
  host.addEventListener('click', function(e){
    const go = e.target.closest && e.target.closest('[data-goto]');
    if (go) { e.preventDefault(); gotoRoute(go.getAttribute('data-goto')); }
  });


  function haystack(route){
    const ids = [];
    route.stages.forEach(function(stage){ stage.resources.forEach(function(id){ ids.push(id); }); });
    return [route.title,route.deck,route.artifact,route.prerequisites].concat(route.outcomes).concat(ids.map(function(id){ const r=RES[id]; return r ? [r.name,r.provider,r.note,r.format].join(' ') : ''; })).join(' ').toLowerCase();
  }
  function renderFilter(){
    let shown = 0;
    DATA.routes.forEach(function(route){
      const element = host.querySelector('[data-route="'+route.id+'"]');
      const okSearch = !search || haystack(route).indexOf(search) >= 0;
      const okHours = hours === 'all' || route.hours <= Number(hours);
      const okFocus = focus === 'all' || route.focus === focus;
      const okAccess = access === 'all' || route.access === access;
      const visible = okSearch && okHours && okFocus && okAccess;
      element.hidden = !visible;
      if (visible) shown++;
    });
    const count = document.getElementById('cd-count');
    if (count) count.innerHTML = 'Showing <b>'+shown+'</b> of '+DATA.routes.length+' routes · '+DATA.resources.length+' source-checked resources in the demonstration.';
    const routesHost = document.getElementById('cd-routes');
    let empty = routesHost.querySelector('.cd-empty');
    if (!shown && !empty) { empty = document.createElement('p'); empty.className='cd-empty'; empty.textContent='No route matches those filters. Clear the search or allow more weekly time.'; routesHost.appendChild(empty); }
    if (shown && empty) empty.remove();
  }
  host.addEventListener('input',function(event){
    if (event.target.id === 'cd-search') { search = event.target.value.trim().toLowerCase(); renderFilter(); return; }
    if (event.target.id === 'cd-hours') { hours = event.target.value; renderFilter(); return; }
    if (event.target.id === 'cd-focus') { focus = event.target.value; renderFilter(); return; }
    if (event.target.id === 'cd-access') { access = event.target.value; renderFilter(); return; }
    if (event.target.matches('[data-cd-step]')) {
      progress[event.target.dataset.cdStep] = event.target.checked;
      writeStore();
      const route = event.target.closest('.cd-route');
      const open = route && route.open;
      host.innerHTML = shellHTML();
      if (open) { const again = host.querySelector('[data-route="'+route.dataset.route+'"]'); if (again) again.open = true; }
      renderFilter();
    }
  });
  host.addEventListener('click',function(event){
    const button = event.target.closest('[data-cd-reset]');
    if (!button) return;
    const id = button.dataset.cdReset;
    Object.keys(progress).forEach(function(key){ if (key.indexOf(id+':') === 0) delete progress[key]; });
    writeStore();
    host.innerHTML = shellHTML();
    const route = host.querySelector('[data-route="'+id+'"]'); if (route) route.open = true;
    renderFilter();
  });
  renderFilter();
})(window);
