// History notes for decision cards based on real moments in Singapore's past.
//
// "context" is shown before the player decides and never gives away what
// Singapore actually did. "did", "outcome" and how the player's choice
// compares are revealed at the next history moment (or at the end of the
// game), so players think it through for themselves first.
//
// Keys are "<decision kind>:<id>". gov lists the option ids closest to what
// Singapore actually did; note explains where the game's options simplify it.

export const HISTORY = {
  "crisis:withdrawal": {
    title: "The British withdrawal",
    when: "1968–1971",
    context: [
      "In January 1968, less than three years after independence, Britain announced it would pull its forces out of Singapore by the end of 1971, years earlier than expected.",
      "The bases were a huge part of the economy: roughly a fifth of national income, about a tenth of the island's land, and tens of thousands of local jobs, directly and through contractors. Unemployment was already high, and Singapore had only just begun building its own armed forces.",
      "Leaders had to stop a sudden collapse in jobs, and decide what to do with the bases, docks and land the British would leave behind.",
    ],
    did: "The government treated it as an emergency. A Bases Economic Conversion Department took over the bases and turned them to civilian use. The Jurong Town Corporation was set up in 1968 to build industrial estates faster, and the Economic Development Board went after foreign manufacturers. New labour laws in 1968 aimed to make Singapore attractive to investors, while workers were helped to retrain and move into new jobs.",
    gov: ["estates", "retrain"],
    note: "Singapore did both: it converted the land for industry and helped workers retrain.",
    outcome: "Instead of rising, unemployment fell sharply by the early 1970s as factories and new industries grew. Historians often describe the withdrawal as a crisis that became a catalyst. The trade-off was that workers accepted tighter labour rules and less bargaining power in exchange for investment and jobs, a balance that is still debated.",
    sources: [
      { name: "SG101: British withdrawal case study", url: "https://www.sg101.gov.sg/economy/case-studies/withdrawal/" },
      { name: "Roots.sg: the British military withdrawal", url: "https://www.roots.gov.sg/muse/articles/the-story-of-the-sree-narayana-mission-and-the-british-military-withdrawal-from-singapore" },
    ],
  },
  "crisisMid:withdrawal": {
    title: "The naval dockyard",
    when: "1968",
    context: [
      "The Sembawang naval dockyard was one of the largest employers on the island, with thousands of skilled workers who repaired Royal Navy ships.",
      "Once the navy left, the yard would have no customers. It could be sold off for other uses, or someone would have to find commercial ships to repair and keep the workers busy.",
    ],
    did: "The dockyard was handed over in December 1968 and reopened as Sembawang Shipyard, a commercial ship-repair yard, at first run with a British shipbuilding firm as manager. Most of its skilled workforce was kept on.",
    gov: ["yes"],
    outcome: "Ship repair and shipbuilding became one of Singapore's major industries for decades. Sembawang Shipyard later became part of Sembcorp Marine, which merged with Keppel's offshore and marine arm in 2023 to form Seatrium.",
    sources: [{ name: "SG101: British withdrawal case study", url: "https://www.sg101.gov.sg/economy/case-studies/withdrawal/" }],
  },
  "crisis:oil": {
    title: "The 1973 oil crisis",
    when: "1973–1974",
    context: [
      "In October 1973, Arab oil producers cut supplies to countries that supported Israel in the Yom Kippur War. Within months, oil prices roughly quadrupled.",
      "Singapore imports all of its energy, so petrol, electricity and transport costs jumped. Inflation, about 2% in 1972, shot up to around 20% in 1973 and 1974.",
      "Leaders had to decide who should carry the higher costs (the budget, businesses or households) and how to stop rising prices from spiralling into wage demands and job losses.",
    ],
    did: "Singapore did not try to hold prices down for long. Fuel and power prices went up, and government offices were ordered to cut their electricity use. The focus was on stopping inflation: the Singapore dollar had been floated in 1973 and import controls were lifted. In 1974 the National Wages Council recommended a large wage rise so that workers could cope with the higher cost of living.",
    gov: ["pass"],
    note: "Closest to passing the costs on, but softened by a wage rise for workers.",
    outcome: "Once the shock passed, inflation fell back to under 3% in 1975, and growth slowed but stayed positive (about 7% in 1974 and 4% in 1975). The crisis convinced planners that a small country without oil must keep prices stable and build up reserves, ideas that shaped how it handled later crises.",
    sources: [
      { name: "MAS: how inflation has evolved in Singapore", url: "https://www.mas.gov.sg/monetary-policy/economics-edu-inflation/inflation/how-has-inflation-evolved-in-singapore" },
      { name: "PM Goh Chok Tong, May Day speech 2001", url: "https://www.nas.gov.sg/archivesonline/data/pdfdoc/2001043002.htm" },
    ],
  },
  "crisis:recession85": {
    title: "The 1985 recession",
    when: "1985–1986",
    context: [
      "In 1985 Singapore's economy shrank for the first time since independence. The world economy was weak, and demand for oil rigs and ships collapsed.",
      "Costs at home had also risen fast. Wages grew about 14% a year from 1979 to 1984, far ahead of productivity (about 5% a year), partly because of a deliberate high-wage policy and high CPF contributions. Firms were losing orders to cheaper neighbours.",
      "Leaders had to choose between spending their way out, protecting the budget, or making Singapore cheaper to do business in, knowing that cutting costs meant asking workers to give something up.",
    ],
    did: "An Economic Committee chaired by Lee Hsien Loong, then a Minister of State, recommended cutting costs. In 1986 the employers' CPF contribution was cut from 25% to 10% of wages, unions agreed to two years of wage restraint, and company tax was reduced. Wages were later made more flexible, with a variable part that could rise and fall with business conditions.",
    gov: ["costs"],
    outcome: "The economy bounced back quickly: growth reached about 10.8% in 1987. The flexible wage system helped Singapore cut costs faster in later crises. But workers carried much of the burden through lower CPF savings, and it took years for contribution rates to be restored.",
    sources: [
      { name: "SG101: the 1985 recession", url: "https://www.sg101.gov.sg/economy/case-studies/1985/" },
      { name: "LKY School: tripartism case study", url: "https://lkyspp.nus.edu.sg/research/case-insights-unit/tripartism/section-3" },
    ],
  },
  "crisis:afc": {
    title: "The Asian financial crisis",
    when: "1997–1998",
    context: [
      "In July 1997 the Thai baht collapsed, and panic spread across Asia. Currencies, stock markets and property prices crashed in Thailand, Indonesia, Malaysia and South Korea.",
      "Singapore's banks and currency held up better, but its neighbours were also its customers. Tourists stayed away, trade fell, property prices dropped sharply, and Singapore slid into recession in 1998.",
      "Leaders had to decide whether to protect households, businesses or future growth, and how much to spend.",
    ],
    did: "Singapore responded in two rounds in 1998. In June, a $2 billion package gave rental and property-tax rebates and helped businesses get loans. In November came a much larger package of about $10.5 billion to cut business costs: the employers' CPF contribution was cut by 10 percentage points for two years, and many firms reduced wages using the flexible wage system.",
    gov: ["rebate"],
    note: "Closest to rebates, but the bigger move was cutting business costs, including employers' CPF.",
    outcome: "Singapore returned to growth in 1999, faster than most of its neighbours, and the cuts were reversed gradually. The crisis pushed Singapore to open up its banking sector and sign free-trade agreements further afield, so that it depended less on the region. Critics again pointed out that workers' CPF savings took the hit.",
    sources: [
      { name: "National Archives: 1998 cost-cutting measures", url: "https://www.nas.gov.sg/archivesonline/data/pdfdoc/1998111202.htm" },
      { name: "MOF: Budget 2000 round-up speech", url: "https://www.mof.gov.sg/news-resources/newsroom/round-up-speech-for-the-debate-on-the-financial-year-2000-budget-delivered-by-dr-richard-hu-minister-for-finance-at-parliament-house-on-7-mar-2000/" },
    ],
  },
  "crisis:sars": {
    title: "SARS",
    when: "2003",
    context: [
      "In March 2003, a new and deadly respiratory virus, SARS, arrived in Singapore through a traveller returning from Hong Kong. It spread mainly inside hospitals, infecting many doctors and nurses.",
      "There was no vaccine, no cure, and little was known about how it spread. Visitor arrivals fell by more than half in early April, hotels emptied, and people avoided crowded places.",
      "Leaders had to weigh public health against livelihoods, and decide how far to restrict people's freedom of movement.",
    ],
    did: "Singapore chose strict containment. People who had been in contact with patients were put under legally enforced home quarantine, temperature screening was set up at the airport, schools and workplaces, and schools were closed for a time. The government also announced a $230 million relief package for the hardest-hit tourism and transport businesses.",
    gov: ["strict", "relief"],
    note: "Singapore did both: strict containment and relief for the hardest-hit businesses.",
    outcome: "The World Health Organization removed Singapore from its list of SARS-affected areas on 31 May 2003. About 238 people were infected and 33 died, many of them healthcare workers. The experience led to stockpiles of protective equipment, pandemic plans and, eventually, the National Centre for Infectious Diseases, preparations that were used again during COVID-19.",
    sources: [
      { name: "MOF: $230 million SARS relief package", url: "https://www.mof.gov.sg/news-resources/newsroom/government-unveils-230-million-sars-relief-package/" },
      { name: "MOH: SARS update, July 2003", url: "https://www.moh.gov.sg/newsroom/sars-update---9-july-2003/" },
    ],
  },
  "crisisMid:sars": {
    title: "Hospitals under strain",
    when: "2003",
    context: [
      "As SARS cases grew, hospital staff were exhausted, and many healthcare workers had caught the virus from patients.",
      "Keeping SARS patients apart from everyone else was vital, but specialist isolation wards cost money and take time to set up. Volunteers were willing to help, but the risk of infection was real.",
    ],
    did: "Singapore concentrated SARS patients at Tan Tock Seng Hospital and its Communicable Disease Centre under strict infection controls, rather than spreading them across hospitals. A public fund, the Courage Fund, was set up to support healthcare workers and families affected by SARS.",
    gov: ["wards"],
    outcome: "Concentrating patients in one place helped bring the outbreak under control within months. The lessons fed into the design of dedicated infectious-disease facilities, which opened in 2019 as the National Centre for Infectious Diseases.",
    sources: [{ name: "MOH: SARS update, July 2003", url: "https://www.moh.gov.sg/newsroom/sars-update---9-july-2003/" }],
  },
  "crisis:gfc": {
    title: "The global financial crisis",
    when: "2008–2009",
    context: [
      "In September 2008 the American investment bank Lehman Brothers collapsed, and the global financial system froze. Banks stopped lending, world trade plunged, and Singapore's exports fell steeply.",
      "Forecasts warned of the worst recession since independence, and companies began planning layoffs. In earlier downturns Singapore had cut CPF contributions to lower costs. This time, leaders worried that thousands of workers would lose their jobs, and their skills, before any recovery came.",
    ],
    did: "Budget 2009 announced a $20.5 billion Resilience Package. Its centrepiece was the Jobs Credit: employers received cash equal to 12% of the first $2,500 of each worker's monthly wage, to encourage them to keep staff. A training programme, SPUR, paid for workers to upgrade their skills. For the first time ever, the government drew on past reserves, over $4 billion with the President's approval, to fund the Jobs Credit and a scheme to help firms get loans.",
    gov: ["jobs", "skills"],
    note: "Singapore did both: wage support through the Jobs Credit and subsidised training through SPUR.",
    outcome: "The recession was sharp but short. The economy grew by about 15% in 2010, and unemployment stayed far lower than many had feared. Economists still debate how many jobs the Jobs Credit really saved, since it also paid firms that would have kept their workers anyway. The idea of wage support returned on a much larger scale during COVID-19.",
    sources: [
      { name: "MOF: Keeping jobs, building for the future (Budget 2009)", url: "https://www.mof.gov.sg/news-resources/newsroom/keeping-jobs-building-for-the-future/" },
      { name: "PM Lee Hsien Loong, May Day message 2009", url: "https://www.pmo.gov.sg/newsroom/may-day-message-2009-prime-minister-lee-hsien-loong/" },
    ],
  },
  "crisis:covid": {
    title: "COVID-19",
    when: "2020–2022",
    context: [
      "In January 2020 a new coronavirus, first detected in Wuhan, China, reached Singapore. By March it was a global pandemic. Borders closed, flights stopped and tourism collapsed.",
      "In April, cases exploded in crowded dormitories for foreign workers, where hundreds of thousands of men lived in close quarters. There was no vaccine yet.",
      "Leaders had to balance saving lives, keeping hospitals from being overwhelmed and protecting jobs against the economic cost and the strain on people's freedom and mental health.",
    ],
    did: "Singapore did both mass testing and massive support. It built up contact tracing, including the TraceTogether app and tokens, and tested hundreds of thousands of dormitory residents. Across five Budgets in 2020 it committed close to $100 billion, including the Jobs Support Scheme, which paid up to 75% of local workers' wages for a time, and drew on past reserves on a scale never seen before.",
    gov: ["test", "support"],
    note: "Singapore did both: testing and tracing, and very large wage support.",
    outcome: "Singapore had one of the lowest COVID-19 death rates in the world. Its economy shrank by about 4% in 2020 before recovering. The dormitory outbreak exposed poor living conditions for migrant workers and led to new, less crowded dormitory standards. Debate continues over the use of contact-tracing data in police investigations and the long-term cost to the reserves.",
    sources: [
      { name: "MOF: Ministerial statement on the Solidarity Budget", url: "https://www.mof.gov.sg/news-resources/newsroom/ministerial-statement-on-singapore-solidarity-budget/" },
      { name: "Caixin: Singapore's COVID-19 war chest nears 20% of GDP", url: "https://www.caixinglobal.com/2020-05-26/singapore-boosts-its-covid-19-war-chest-to-nearly-20-of-gdp-101559258.html" },
    ],
  },
  "crisisMid:covid": {
    title: "The circuit breaker",
    when: "April 2020",
    context: [
      "By early April 2020, community cases were rising fast and the source of many infections could not be traced.",
      "A lockdown would slow the spread, but it would also shut businesses, keep children at home and cut people off from family and friends. Lighter measures would keep the economy going but risked letting the virus spread further.",
    ],
    did: "Singapore introduced a 'circuit breaker' from 7 April 2020: schools moved to home-based learning, most workplaces and shops closed, and dining in was banned. It was extended until 1 June, and the economy then reopened in phases.",
    gov: ["lockdown"],
    outcome: "Community cases fell sharply during the circuit breaker, though dormitory cases continued for months. Many businesses suffered, and surveys found higher stress and loneliness during the period, which informed later, more targeted rules.",
    sources: [{ name: "MOF: Ministerial statement on the Solidarity Budget", url: "https://www.mof.gov.sg/news-resources/newsroom/ministerial-statement-on-singapore-solidarity-budget/" }],
  },
  "crisisMid2:covid": {
    title: "Vaccines arrive",
    when: "2021",
    context: [
      "By the end of 2020, the first COVID-19 vaccines had been approved. Supplies were limited, some people were hesitant, and every month of delay meant more restrictions and more risk to older people.",
      "The government could make vaccination as easy as possible everywhere, or leave it to clinics and personal choice.",
    ],
    did: "Singapore began vaccinating at the end of December 2020 and set up vaccination centres in community clubs and other sites in every town, with priority for older people. Vaccination was free. Later, people who were not vaccinated faced extra rules on dining out and entering some places.",
    gov: ["drive"],
    outcome: "By late 2021, more than four in five residents were fully vaccinated, one of the highest rates in the world. This allowed Singapore to reopen and treat COVID-19 as endemic in 2022. The rules for unvaccinated people were controversial with a minority but were later lifted.",
    sources: [{ name: "MOF: Ministerial statement on the Solidarity Budget", url: "https://www.mof.gov.sg/news-resources/newsroom/ministerial-statement-on-singapore-solidarity-budget/" }],
  },
  "dilemma:hawkers": {
    title: "Street hawkers",
    when: "1970s",
    context: [
      "In the 1960s, many thousands of street hawkers sold food and goods from pushcarts and stalls along roads and five-foot ways. They fed workers cheaply and gave jobs to people with few other options.",
      "But they also blocked traffic, dumped waste into drains, and could spread diseases such as cholera where hygiene was poor.",
      "Moving them meant asking hawkers to give up busy spots, pay rent and follow new rules, and risked raising food prices for the people who relied on them.",
    ],
    did: "From 1971, the government built hawker centres and moved street hawkers into them, first to temporary sites such as back lanes and car parks, then into permanent centres. Rents were kept low so that food prices would not rise, and a special squad enforced the rules against unlicensed hawkers. By 1986 the resettlement was complete: about 18,000 hawkers had moved into more than 100 hawker centres.",
    gov: ["move"],
    outcome: "Hawker centres became one of Singapore's best-known institutions, and in 2020 Singapore's hawker culture was added to UNESCO's list of Intangible Cultural Heritage. Today's challenges are different: many hawkers are ageing, fewer young people want to take over, and keeping food cheap while hawkers earn a fair living remains a hard balance.",
    sources: [
      { name: "NLB: Hawkers and hawker centres after independence", url: "https://curiocity.nlb.gov.sg/hawkers-after-independence" },
      { name: "Roots.sg: the history of hawker culture", url: "https://www.roots.gov.sg/stories-landing/stories/serving-up-a-legacy" },
    ],
  },
  "dilemma:stopAtTwo": {
    title: "Stop at Two",
    when: "1970s",
    context: [
      "In the mid-1960s, the average woman in Singapore had between four and five children. Housing, schools and jobs were struggling to keep up, and leaders feared that fast population growth would keep families poor.",
      "Family planning clinics had been set up from 1966. The question was how hard the state should push families to have fewer children: through advice and persuasion alone, or with penalties as well.",
    ],
    did: "The government launched the 'Stop at Two' campaign in 1972. It used posters and slogans, and also penalties for larger families: higher hospital fees for each extra birth, less tax relief, lower priority in primary school registration for fourth and later children, and lower priority for public housing for very large families. Laws on abortion and voluntary sterilisation were also relaxed.",
    gov: ["push"],
    outcome: "It worked faster than expected. The birth rate fell to replacement level (about 2.1 children per woman) by 1975 and kept falling, to under 1.5 by the mid-1980s. In 1987 the government reversed course with 'Have three or more, if you can afford it', and it has since spent heavily on baby bonuses and family support. Singapore's birth rate is now among the lowest in the world. Researchers debate how much the campaign caused this, since rising education and incomes lowered birth rates across Asia too.",
    sources: [
      { name: "Population planning in Singapore (overview)", url: "https://en.wikipedia.org/wiki/Population_planning_in_Singapore" },
      { name: "Singapore Women's Hall of Fame: our perplexing population problem", url: "https://www.swhf.sg/tlow-2-panel-2/" },
    ],
  },
  "dilemma:roadPricing": {
    title: "Charging cars to enter the city",
    when: "1975",
    context: [
      "By the early 1970s, car ownership was rising quickly and the roads into the city centre jammed every morning.",
      "Building more roads takes years, uses scarce land and often just attracts more cars. Economists had suggested charging drivers for using the busiest roads at the busiest times, so that people would share cars, travel at other times or take the bus. But no city in the world had made it work, and drivers would hate it.",
    ],
    did: "In June 1975 Singapore became the first city in the world to run a congestion charge, the Area Licensing Scheme. Drivers had to buy and display a paper licence to enter the city centre during the morning peak, and car parks with shuttle buses were provided at the edge of the zone. In 1998 it was replaced by Electronic Road Pricing (ERP), with overhead gantries that charge automatically and vary by time and place.",
    gov: ["charge"],
    outcome: "Traffic into the city centre fell sharply as soon as the scheme began. Road pricing has stayed central to Singapore's transport policy, alongside limits on the number of cars through the Certificate of Entitlement from 1990. London and Stockholm later adopted congestion charges of their own. Drivers still complain about the cost, and a satellite-based system is now replacing the gantries.",
    sources: [
      { name: "NLB Infopedia: Area Licensing Scheme", url: "https://eresources.nlb.gov.sg/infopedia/articles/SIP_777_2004-12-13.html" },
      { name: "Asian Development Bank: the case for Electronic Road Pricing", url: "https://development.asia/case-study/case-electronic-road-pricing" },
    ],
  },
  "dilemma:integration": {
    title: "Mixed estates",
    when: "1989",
    context: [
      "Early HDB towns were filled by resettling people from kampongs and old neighbourhoods, often mixing communities that had lived apart under colonial rule.",
      "By the 1980s, as people bought and sold flats freely, some neighbourhoods were again becoming dominated by one ethnic group: parts of Bedok and Tampines had over 30% Malay households, and parts of Hougang over 90% Chinese.",
      "Leaders worried that enclaves would weaken racial harmony. But limiting who can buy a flat restricts people's choices and can make some flats harder to sell.",
    ],
    did: "The Ethnic Integration Policy took effect on 1 March 1989. It set a maximum share for each ethnic group in every HDB block and neighbourhood (for a block: 87% Chinese, 25% Malay, and 13% Indian and others). Once a block reaches the limit for a group, flats there can only be resold in ways that keep within the limit. A similar quota for non-Malaysian permanent residents was added in 2010.",
    gov: ["quota"],
    outcome: "HDB estates remain mixed today, and the policy is widely credited with preventing ethnic enclaves in public housing, where most Singaporeans live. The cost falls on some sellers, especially from minority groups, who may find fewer eligible buyers and have to accept lower prices or wait longer. The government has reviewed the policy several times and kept it, while acknowledging these trade-offs.",
    sources: [
      { name: "SG101: HDB Ethnic Integration Policy", url: "https://www.sg101.gov.sg/society/examples/hdb/" },
      { name: "gov.sg: why the Ethnic Integration Policy still matters", url: "https://www.gov.sg/article/hdbs-ethnic-integration-policy-why-it-still-matters" },
    ],
  },
  "dilemma:casino": {
    title: "Casinos in Singapore?",
    when: "2004–2005",
    context: [
      "In the early 2000s, Singapore's tourism was losing ground to newer, more exciting destinations, and the economy needed new sources of growth.",
      "Casinos had long been banned for fear of gambling addiction, crime and family breakdown. A proposal emerged to allow 'integrated resorts': hotels, convention centres and attractions with a casino inside, to draw tourists and investment.",
      "Religious groups and many citizens strongly objected. Supporters argued the jobs and tourism were too important to miss, and that many Singaporeans already gambled overseas.",
    ],
    did: "After a year of public debate, Prime Minister Lee Hsien Loong announced in April 2005 that Singapore would allow two integrated resorts, at Marina Bay and Sentosa, which opened in 2010. Safeguards were built in: Singaporeans and permanent residents pay an entry levy ($100 a day at first, raised to $150 in 2019), families can apply to bar a relative from entering, the casinos cannot lend money to locals, and a council on problem gambling was set up.",
    gov: ["yes"],
    outcome: "The resorts brought many tourists, jobs and tax revenue, and Marina Bay Sands became part of the skyline. Official surveys found the share of residents with probable gambling problems fell from 2.6% in 2011 to about 1% by 2017, and local visits to the casinos halved between 2010 and 2018. Critics argue some harm is hidden and that the state now earns a lot from gambling.",
    sources: [
      { name: "National Archives: PM's statement on integrated resorts, April 2005", url: "https://www.nas.gov.sg/archivesonline/data/pdfdoc/2005041803.htm" },
      { name: "MSF: updates on problem gambling", url: "https://www.msf.gov.sg/media-room/article/Updates-on-Problem-Gambling" },
    ],
  },
  "dilemma:water": {
    title: "Water from Malaysia",
    when: "2000s",
    context: [
      "Singapore has little land to collect rain, and since before independence it has relied on water piped from Johor under two agreements with Malaysia, signed in 1961 and 1962. The first would end in 2011 and the second in 2061.",
      "Water had been a recurring source of tension between the two countries, and leaders saw depending on imported water as a strategic weakness.",
      "Technology offered alternatives, but treating used water to drinking standard is expensive, and people might refuse to drink what newspapers called 'sewage water'.",
    ],
    did: "Singapore invested heavily in becoming more self-reliant. In 2003 it launched NEWater: used water cleaned with membranes and ultraviolet light to a very high standard, mostly for factories, with a little added to reservoirs. The first desalination plant opened in 2005. The 1961 agreement was allowed to end in 2011. With local rainwater and imported water, these became Singapore's 'Four National Taps'.",
    gov: ["newater"],
    outcome: "NEWater can now meet up to about 40% of Singapore's water demand, and with more desalination Singapore aims to be largely self-sufficient by the time the 1962 agreement ends in 2061. The trade-off is cost and energy: NEWater and desalination need far more electricity than rainwater, and water prices were raised by 30% in 2017 and 2018, partly for this reason.",
    sources: [
      { name: "Eco-Business: Singapore's race to water self-sufficiency", url: "https://www.eco-business.com/opinion/singapores-race-to-self-sufficiency-in-malaysia-water-stoush/" },
      { name: "The Star: the Singapore–Malaysia water agreements", url: "https://thestar.com.my/news/focus/2024/03/24/singapore-malaysia039s-water-row" },
    ],
  },

  // ---------------- batch 2 ----------------
  "dilemma:pigs": {
    title: "Pig farms",
    when: "1980s",
    context: [
      "In the 1970s, Singapore still raised most of its own pork. Hundreds of pig farms produced huge amounts of waste: a litre of raw pig waste is many times more polluting than the same amount of human sewage.",
      "Waste washed into rivers and the reservoirs that supplied drinking water, and the smell spread to nearby estates. In 1974 farms were concentrated in Punggol to keep them away from water catchments.",
      "Ending pig farming would protect water and free up land, but it would cost farmers their livelihoods and leave Singapore depending on imported meat.",
    ],
    did: "In 1984 the government decided to phase out pig farming altogether and import live pigs and frozen pork instead. Farmers were compensated and given time to wind down, and the last farms in Punggol closed in 1989. The land later became part of Punggol new town.",
    gov: ["phase"],
    outcome: "Rivers and reservoirs became much cleaner, supporting the clean-up of the Singapore River and Kallang Basin, and new towns were later built on the old farmland. The cost was the end of a way of life for farming families, and Singapore's food supply came to depend almost entirely on imports, a vulnerability that became a national concern decades later.",
    sources: [
      { name: "Roots.sg: Of swine and sustainability", url: "https://www.roots.gov.sg/stories-landing/stories/of-swine-and-sustainability/story" },
      { name: "Roots.sg: Agriculture and wildlife of Punggol", url: "https://www.roots.gov.sg/han/neighborhoods/punggol/han-resources-folder/agriculture-and-wildlife-of-punggol" },
    ],
  },
  "dilemma:babyBonus": {
    title: "Paying for babies",
    when: "2001",
    context: [
      "By the late 1990s, Singapore's birth rate had fallen far below the 2.1 children per woman needed to replace the population. The 'Have three or more' message of 1987 had not reversed the trend.",
      "More women were working and studying longer, marrying later, and finding it hard to balance a career with raising children. Leaders debated whether money could change such personal decisions, or whether what parents needed was time, childcare and flexible jobs.",
    ],
    did: "In 2001 the government introduced the Baby Bonus: a cash gift for each new child, plus matching government contributions to a savings account for the child's needs. It was part of a wider package that also offered more maternity leave and childcare subsidies, and the support was made more generous many times in later years.",
    gov: ["generous", "childcare"],
    note: "Singapore did both: cash for parents and more childcare support.",
    outcome: "Spending on these schemes grew from about $500 million a year in 2001 to around $2 billion by 2013, yet the birth rate kept falling, to about 1.2 children per woman in the 2010s and below 1.0 in the 2020s. Most researchers think money alone does little against long working hours, housing costs and changing attitudes, and the debate has shifted towards work culture and support for parents.",
    sources: [
      { name: "Singapore Women's Hall of Fame: our perplexing population problem", url: "https://www.swhf.sg/tlow-2-panel-2/" },
      { name: "Hong Kong Legislative Council research: measures to encourage childbirth in Singapore", url: "https://www.legco.gov.hk/research-publications/english/essentials-2021ise21-measures-to-encourage-childbirths-in-singapore.htm" },
    ],
  },
  "dilemma:haze": {
    title: "The haze",
    when: "1997, 2013, 2015",
    context: [
      "Almost every dry season, forests and peatland in Indonesia are burned to clear land, often for plantations. When the wind blows the smoke towards Singapore, the air becomes unhealthy for days or weeks.",
      "In June 2013 the air quality index (PSI) hit 401, the worst reading ever recorded. The fires are in another country, so Singapore cannot simply put them out. It can only protect its own people and pressure others to act.",
    ],
    did: "Singapore advised people to stay indoors and handed out free N95 masks to vulnerable and lower-income households. It drew up a plan to close schools if the air became hazardous, and did close them for a day in 2015. In 2014 it passed the Transboundary Haze Pollution Act, which lets Singapore fine companies, even foreign ones, that cause fires leading to haze in Singapore.",
    gov: ["masks"],
    note: "Closest to protecting the vulnerable. Schools were closed only when the air became hazardous.",
    outcome: "Major haze episodes have become less frequent since 2015, as Indonesia tightened its own rules and banned new peatland clearing, and as companies faced public pressure. The law has been hard to enforce across borders, but it signalled that companies would be held responsible. Haze can still return in very dry years.",
    sources: [
      { name: "NLB Infopedia: the 2013 haze", url: "https://eresources.nlb.gov.sg/infopedia/articles/SIP_2013-08-30_185150.html" },
      { name: "Eco-Business: 5 ways Singapore is dealing with the haze", url: "https://www.eco-business.com/news/5-ways-singapore-is-dealing-with-the-haze/" },
    ],
  },
  "dilemma:mrtFault": {
    title: "MRT breakdowns",
    when: "2011–2017",
    context: [
      "On 15 and 17 December 2011, the North-South Line broke down during busy hours, trapping commuters in stuffy trains and affecting well over 100,000 people.",
      "The oldest lines dated from 1987 and were carrying far more passengers than planned. Fixing them properly would mean replacing rails, power systems and signalling, with closures and huge costs, while a quick fix would be cheaper but might not last.",
    ],
    did: "A Committee of Inquiry found the breakdowns were preventable and blamed poor maintenance, and the operator SMRT was fined the maximum $2 million. The government then paid for a long-term renewal of the oldest lines: new signalling, new sleepers, a new power system and new trains, with early closures and some full-day line closures to do the work. In 2016 the government bought the operators' trains and equipment so that it could plan and pay for renewal directly.",
    gov: ["renew"],
    outcome: "Reliability improved dramatically after the renewal, reaching over a million train-kilometres between delays by around 2020, among the best metro systems in the world. The road was bumpy: a tunnel flooded in 2017 because of poor maintenance, and commuters endured years of weekend closures. The episode showed the cost of putting off maintenance.",
    sources: [
      { name: "Land Transport Guru: the New Rail Financing Framework", url: "https://landtransportguru.net/new-rail-financing-framework/" },
      { name: "SMRT Trains (overview)", url: "https://en.wikipedia.org/wiki/SMRT_Trains" },
    ],
  },
  "dilemma:dorm": {
    title: "A dormitory next door",
    when: "2008",
    context: [
      "Singapore relies on hundreds of thousands of foreign workers to build its homes, roads and MRT lines. They need somewhere to live.",
      "In 2008 the government planned to turn an empty school in Serangoon Gardens, a private housing estate, into a dormitory for foreign workers. About 1,400 households signed a petition against it, worried about safety, crowding and traffic. Others pointed out that the workers were building the city everyone lived in.",
    ],
    did: "The government went ahead with the dormitory, but made changes to address residents' concerns. It started with fewer workers (about 600), gave the dorm its own shop and facilities so workers did not need to go into the estate, and built a separate access road so they could come and go without passing through it. Construction was delayed by the dispute.",
    gov: ["build"],
    note: "Built where planned, but with a smaller first intake and its own road and facilities.",
    outcome: "The Serangoon Gardens dormitory opened and there were few problems, but the debate showed how many residents wanted foreign workers out of sight. Later dormitories were mostly built in industrial areas, often large and crowded. In 2020 COVID-19 spread rapidly through these dorms, and the government introduced new standards for less crowded, better-equipped dormitories.",
    sources: [
      { name: "PropertyGuru: controversial dorm to open by August (2009)", url: "https://www.propertyguru.com.sg/property-management-news/2009/11/44180/controversial-dorm-to-open-by-august" },
      { name: "Global Voices: the foreign workers moving in next door (2008)", url: "https://globalvoices.org/2008/09/10/singapore-the-foreign-workers-moving-in-next-door/" },
    ],
  },
  "dilemma:nimby": {
    title: "A nursing home next door",
    when: "2012",
    context: [
      "Singapore's population is ageing fast, and more nursing homes and eldercare centres are needed close to where families live.",
      "In 2012 the Ministry of Health planned a nursing home on a field next to HDB blocks in Bishan. Residents of the blocks facing the site objected: they would lose the field and their views, and some feared flat prices would fall. Similar objections arose to eldercare centres in other towns. Many other residents supported the plans.",
    ],
    did: "The ministry looked at other sites but found none available, and decided to go ahead in Bishan. To address residents' concerns, the building was lowered from eight storeys to six.",
    gov: ["build"],
    note: "Built where planned, with a lower building as a compromise.",
    outcome: "The episode sparked a national conversation about the 'Not In My Back Yard' attitude, and a counter-campaign, 'Say Yes to Elder Care', gathered thousands of signatures. Eldercare facilities have since been built into many new HDB developments from the start, such as Kampung Admiralty, so that care is part of the neighbourhood rather than added later.",
    sources: [
      { name: "PropertyGuru: construction of elderly home in Bishan to proceed (2012)", url: "https://marketplace-guruland-proxy.propertyguru.com.sg/property-management-news/2012/9/42427/construction-of-elderly-home-in-bishan-east-to-proceed" },
      { name: "SMU: the silent majority (2012)", url: "https://news.smu.edu.sg/news/2012/06/12/silent-majority" },
    ],
  },
  "dilemma:busStrike": {
    title: "The bus drivers' strike",
    when: "2012",
    context: [
      "Strikes are very rare in Singapore. Disputes are usually settled through talks between the government, employers and unions, and strikes in essential services such as public transport are illegal without notice.",
      "In November 2012, about 170 bus drivers from China, employed by SMRT, refused to work. They were unhappy that they were paid less than drivers from Malaysia and about conditions in their dormitories. It was the first major strike in Singapore in decades.",
    ],
    did: "The government treated it as an illegal strike. Five drivers said to be the leaders were charged in court and jailed for up to seven weeks, and 29 others had their work permits cancelled and were sent home. At the same time, the Ministry of Manpower told SMRT to improve the drivers' dormitories and review their pay.",
    gov: ["hard"],
    note: "A hard line on the strike itself, with pressure on the company to fix pay and housing.",
    outcome: "Buses were back to normal within days, and there has been no comparable strike since. Supporters said the firm response protected essential services and industrial peace. Human rights groups criticised the jailing and deportations, and the case drew attention to the treatment of migrant workers, a debate that grew louder after COVID-19 spread through workers' dormitories in 2020.",
    sources: [
      { name: "Human Rights Watch: Singapore bus strike (2012)", url: "https://www.hrw.org/news/2012/12/05/singapore-drop-charges-against-bus-strike-leaders" },
      { name: "China Labour Bulletin: drivers jailed for organising strike", url: "https://clb.org.hk/en/node/2407" },
    ],
  },
  "dilemma:liftUpgrade": {
    title: "Lifts on every floor",
    when: "2001",
    context: [
      "Many older HDB blocks had lifts that stopped only every two or three floors, to save money when they were built. Residents had to walk up or down the stairs to reach their homes.",
      "As the population aged, this became a serious problem for seniors and people with disabilities. Adding lift stops to thousands of old blocks would be costly and technically difficult, and residents would usually have to pay a share.",
    ],
    did: "HDB launched the Lift Upgrading Programme in 2001, aiming to give every eligible block a lift that stops on every floor. The government paid most of the cost, with residents paying a small share. Some blocks needed new lift shafts built on the outside.",
    gov: ["every"],
    outcome: "The programme reached more than 5,000 blocks, and today around 99% of HDB blocks have lifts that stop on every floor. A small number of blocks could not be upgraded because of cost or technical limits. The programme was part of a shift towards helping people 'age in place' in their own homes and neighbourhoods.",
    sources: [{ name: "MND: written answer on blocks without direct lift access (2024)", url: "https://www.mnd.gov.sg/newsroom/speeches/view/written-answer-by-ministry-of-national-development-on-whether-hdb-has-considered-installing-stair-lifts-or-escalators-or-redevelopment-for-hdb-blocks-that-still-lack-direct-lift-access" }],
  },
  "dilemma:heritage": {
    title: "Saving an old landmark",
    when: "1999–2004",
    context: [
      "Singapore has always been short of land, and in the decades after independence many old buildings were knocked down to make way for new roads, offices and housing.",
      "Some buildings mean a lot to people. The red-brick National Library on Stamford Road, opened in 1960, was where generations of Singaporeans had studied and borrowed books. Planners wanted the site for a road tunnel under Fort Canning as part of a plan for the civic district. Many people protested.",
    ],
    did: "Planners decided the tunnel was the only workable option, and the library building was closed in 2004 and demolished. A new National Library opened on Victoria Street in 2005, and some bricks from the old building were reused there. Two of the old gate pillars still stand at the site.",
    gov: ["sell"],
    note: "Closest to letting it be demolished, though the real reason was a road tunnel rather than a mall.",
    outcome: "The loss of the old library became a turning point. It sparked much greater public interest in heritage, and since then more buildings have been conserved and the public is consulted more often. Some still see the demolition as an example of losing shared memories for the sake of development.",
    sources: [
      { name: "Old National Library Building (overview)", url: "https://en.wikipedia.org/wiki/Old_National_Library_Building" },
      { name: "Roots.sg: the National Library at Stamford Road", url: "https://www.roots.gov.sg/Collection-Landing/listing/1191657" },
    ],
  },
  "dilemma:pcn": {
    title: "Park connectors",
    when: "1991",
    context: [
      "As Singapore became more crowded, parks were scattered between housing estates with no easy, safe way to walk or cycle between them.",
      "Planners proposed linking them with green corridors along drains, rivers and road reserves. It would cost money and land, but could make the city greener and encourage people to exercise.",
    ],
    did: "The Park Connector Network was approved in 1991. The first park connector, along the Kallang River, opened in 1995, and more were added steadily over the following decades.",
    gov: ["build"],
    outcome: "The network passed 300 km in 2015, five years ahead of target, and reached about 370 km by 2022, with a goal of 500 km by 2030. It is now used daily by joggers, cyclists and families, and has become part of Singapore's idea of a 'City in Nature'.",
    sources: [
      { name: "NParks: 25 years of the Park Connector Network", url: "https://nparks.gov.sg/news/2015/9/community-gathers-to-celebrate-25-years-of-the-park-connector-network" },
      { name: "MND: future plans for park connectors (2022)", url: "https://www.mnd.gov.sg/newsroom/speeches/view/written-answer-by-ministry-of-national-development-on-future-plans-for-park-connector-networks-and-whether-pcns-can-increase-in-number-and-length" },
    ],
  },
  "dilemma:immigration": {
    title: "How many newcomers?",
    when: "2000s–2010s",
    context: [
      "With few babies being born, Singapore's workforce would shrink and age without newcomers. In the 2000s the economy was booming, and employers wanted more workers at every level, from construction to finance.",
      "More immigrants would keep the economy growing, but they would also add to crowding on trains, pressure on housing, and competition for jobs, and some citizens worried about losing a sense of national identity.",
    ],
    did: "Through the 2000s, Singapore opened its doors widely, and the population grew quickly. After strong public unhappiness about crowding and costs, shown in the 2011 general election, the government began tightening the rules on foreign workers. In 2013 a Population White Paper projected the population could reach 6.9 million by 2030, which led to a rare protest of a few thousand people at Hong Lim Park.",
    gov: ["open"],
    note: "Open in the 2000s, then tightened in the 2010s after public pushback.",
    outcome: "Growth slowed after the rules were tightened, and the population was about 6 million in the mid-2020s, well below the 6.9 million projection. Transport and housing building was speeded up to catch up. Immigration remains one of the most debated issues in Singapore, balancing economic needs against crowding and social cohesion.",
    sources: [
      { name: "Population White Paper (overview)", url: "https://en.wikipedia.org/wiki/Population_White_Paper" },
      { name: "SMU: the Population White Paper (2013)", url: "https://news.smu.edu.sg/news/2013/02/07/population-white-paper" },
    ],
  },
  "dilemma:sentosaCove": {
    title: "Luxury homes on Sentosa",
    when: "2000s",
    context: [
      "Sentosa was developed as a resort island for everyone. In the 1990s and 2000s, planners set aside its eastern end for Sentosa Cove: waterfront houses and apartments around a marina.",
      "Foreigners are normally not allowed to buy landed homes in Singapore. Allowing them to do so at Sentosa Cove would attract wealthy residents and investment, but some felt it turned part of a public island into an enclave for the rich.",
    ],
    did: "Singapore went ahead with Sentosa Cove and made it the only place in Singapore where foreigners can buy landed homes (with approval, and for their own use). Homes were sold from the 2000s, and in the five years to 2009 more than a third of house purchases there were by foreigners or permanent residents.",
    gov: ["yes"],
    outcome: "Sentosa Cove became one of Singapore's most exclusive addresses and brought large land sales. Its property prices rose and then fell sharply in the 2010s as rules for foreign buyers tightened elsewhere. Most of Sentosa's beaches and attractions remain open to the public.",
    sources: [{ name: "PropertyGuru: rising trend of foreign buyers at Sentosa Cove (2009)", url: "https://marketplace-guruland-proxy.propertyguru.com.sg/property-management-news/2009/12/47894/rising-trend-of-foreign-buyers-at-sentosa-cove-homes" }],
  },
  // Bukit Timah / Clementi
  "dilemma:offerNjc": {
    title: "Singapore's first junior college",
    when: "1969",
    context: [
      "In the 1960s, students did their final two years of school (pre-university) in many different secondary schools. Leaders wanted a new kind of school that brought the best pre-university students together, with better teachers, labs and activities.",
      "A new college would need a good site with space for science labs and sports, in a place students from across the island could reach.",
    ],
    did: "National Junior College opened in January 1969 as Singapore's first junior college, with 572 students, on Linden Drive off Bukit Timah Road. Prime Minister Lee Kuan Yew officially opened it in 1970.",
    gov: ["yes"],
    outcome: "NJC became the model for every junior college built after it, and the Bukit Timah area became known for its cluster of top schools. Critics argue this concentration of elite schools helped make the area's homes some of the most expensive in Singapore.",
    sources: [
      { name: "NLB Infopedia: National Junior College", url: "https://eresources.nlb.gov.sg/infopedia/articles/SIP_1015_2011-06-22.html" },
      { name: "NJC: our heritage", url: "https://www.nationaljc.moe.edu.sg/our-heritage/" },
    ],
  },
  "dilemma:offerPoly": {
    title: "A new home for Singapore Polytechnic",
    when: "late 1970s",
    context: [
      "Singapore Polytechnic, the country's first, trained the engineers and technicians that new factories and shipyards needed. Its campus on Prince Edward Road in the city was too small for the numbers the economy required.",
      "A new campus would need a large site with workshops and halls, away from the crowded city centre.",
    ],
    did: "Singapore Polytechnic moved to a large new campus on Dover Road, near Clementi, in the late 1970s.",
    gov: ["yes"],
    outcome: "The Dover campus let the polytechnic expand greatly, and polytechnics became a key route into skilled jobs, especially in engineering. The area around Dover and Clementi grew into an education belt, with the university at nearby Kent Ridge.",
    sources: [{ name: "Singapore Polytechnic (overview)", url: "https://en.wikipedia.org/wiki/Singapore_Polytechnic" }],
  },
  "dilemma:offerNus": {
    title: "A campus for the national university",
    when: "late 1970s",
    context: [
      "The University of Singapore was spread across old buildings at Bukit Timah and in the city, with no room to grow. Leaders wanted a modern university to train the professionals a developed economy would need.",
      "The chosen site, the hills of Kent Ridge near the West Coast, was huge: enough land for a whole new town.",
    ],
    did: "The university built a large new campus at Kent Ridge, moving there from the late 1970s. In 1980 it merged with Nanyang University to form the National University of Singapore (NUS).",
    gov: ["yes"],
    outcome: "NUS is now ranked among the top universities in Asia and the world, and the Kent Ridge campus has grown into a district of research institutes, hospitals and science parks. Its old Bukit Timah campus was later used for law and public policy.",
    sources: [{ name: "National University of Singapore (overview)", url: "https://en.wikipedia.org/wiki/National_University_of_Singapore" }],
  },
  "dilemma:offerSji": {
    title: "St Joseph's Institution moves",
    when: "1988",
    context: [
      "St Joseph's Institution, a Catholic mission school founded in 1852, had occupied a historic building on Bras Basah Road for over a century. It had become too small for a modern school.",
      "Moving meant leaving behind a landmark, but gaining room for a field, labs and more students.",
    ],
    did: "SJI moved to a new campus on Malcolm Road in the Bukit Timah area in 1988. Its old building on Bras Basah Road was conserved and became the Singapore Art Museum.",
    gov: ["yes"],
    outcome: "The move is often held up as a good example of reusing a historic building rather than demolishing it, and SJI added to the concentration of well-known schools around Bukit Timah.",
    sources: [{ name: "St. Joseph's Institution, Singapore (overview)", url: "https://en.wikipedia.org/wiki/St._Joseph%27s_Institution,_Singapore" }],
  },
  "dilemma:offerMgs": {
    title: "Methodist Girls' School moves",
    when: "1992",
    context: [
      "Methodist Girls' School had been on Mount Sophia since 1925. Its hillside campus in the city had little room to expand.",
      "A new site would mean a fresh start with modern facilities, but leaving a campus with many memories.",
    ],
    did: "MGS moved to a new campus on Blackmore Drive, off Bukit Timah Road, in 1992.",
    gov: ["yes"],
    outcome: "The school continued to grow at its new home. Together with nearby schools, it reinforced Bukit Timah's reputation as a 'school belt', which keeps demand, and prices, for homes in the area high.",
    sources: [{ name: "MGS: our heritage", url: "https://www.mgs.moe.edu.sg/about-us/our-heritage/" }],
  },
  "dilemma:quarryEnd": {
    title: "Old quarries",
    when: "1980s",
    context: [
      "For decades, granite from quarries around Bukit Timah and Bukit Batok was used to build Singapore's roads and buildings. The name Bukit Batok is often said to mean 'coughing hills', after the sound of blasting.",
      "By the 1980s, digging deeper threatened the environment, and new towns were being built nearby. The deep pits could be filled in for housing or turned into something else.",
    ],
    did: "The quarries in Bukit Batok were closed in the 1980s. HDB had planned to fill one in and build a road over it, but after seeing its dramatic rock faces it turned the quarry into a park instead, now known as Little Guilin. Another quarry became Bukit Batok Nature Park in 1988.",
    gov: ["park"],
    outcome: "The quarry parks are now well-loved green spaces with lakes and cliffs. Nature has returned to old quarry sites across the area, and the old Dairy Farm quarry also became a nature park in 2009.",
    sources: [
      { name: "Bukit Batok Town Park (overview)", url: "https://en.wikipedia.org/wiki/Bukit_Batok_Town_Park" },
      { name: "Time Out: guide to Bukit Batok and Bukit Gombak", url: "https://timeout.com/singapore/things-to-do/the-ultimate-guide-to-bukit-batok-and-bukit-gombak" },
    ],
  },
  "dilemma:ktmClose": {
    title: "The railway land",
    when: "2011",
    context: [
      "Since the early 1900s, a railway owned by Malaya, and later Malaysia, ran through the middle of Singapore to Tanjong Pagar, crossing Bukit Timah. After a long dispute, the two countries agreed that the trains would stop at Woodlands from July 2011 and the land would return to Singapore.",
      "The strip of land was about 24 km long, running through valuable areas. It could be used for housing and roads, or kept as one long green space.",
    ],
    did: "After the Nature Society and members of the public proposed turning it into a green corridor, inspired by New York's High Line, the government decided to keep the line as the Rail Corridor, a continuous trail for walking and cycling. The old Bukit Timah station was conserved, and native trees were planted along the route.",
    gov: ["trail"],
    outcome: "The Rail Corridor has become a much-loved green spine linking nature areas such as Bukit Timah. Some sections are planned to be built around in future, so the balance between nature and development along it continues to be discussed.",
    sources: [
      { name: "SG101: the Rail Corridor in Singapore", url: "https://www.sg101.gov.sg/resources/archives/infrastructure-the-rail-corridor-in-singapore/" },
      { name: "Eco-Business: old KTM tracks to become a green spine", url: "https://www.eco-business.com/news/old-ktm-tracks-to-become-green-spine/" },
    ],
  },
};

export const historyKey = (d) => (d ? `${d.kind}:${d.id}` : null);
export const historyOf = (d) => HISTORY[historyKey(d)] || null;

// Earlier history decisions whose real outcome hasn't been shown yet.
export const pendingReveals = (w) => (w.historyLog || []).filter((h) => !h.revealed);

// Record the player's choice on a history card. Called when they decide;
// anything still waiting is revealed now, because this card showed it.
export function recordHistory(w, d, optId, label) {
  const key = historyKey(d);
  if (!HISTORY[key]) return;
  w.historyLog = w.historyLog || [];
  for (const h of w.historyLog) if (!h.revealed) h.revealed = w.t;
  if (w.historyLog.some((h) => h.key === key)) return; // a repeat card: first answer stands
  w.historyLog.push({ key, year: w.year, choice: optId, label, revealed: null });
}

// Did the player do what Singapore did?
export function compareChoice(h) {
  const H = HISTORY[h.key];
  if (!H) return null;
  return H.gov.includes(h.choice) ? "same" : "different";
}
