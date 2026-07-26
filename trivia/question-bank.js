(function () {
  "use strict";

  const VERSION = "20260726a";
  const DIFFICULTY = "classic";

  function normalize(value) {
    return String(value).trim().toLowerCase();
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function unique(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
      const key = normalize(value);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(String(value));
    }
    return result;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pickDistractors(pool, answer, count, seed) {
    const candidates = unique(pool).filter((value) => normalize(value) !== normalize(answer));
    return candidates
      .map((value, index) => ({ value, score: hashString(`${seed}|${index}|${value}`) }))
      .sort((left, right) => left.score - right.score || left.value.localeCompare(right.value))
      .slice(0, count)
      .map((entry) => entry.value);
  }

  function buildChoices(answer, pool, seed) {
    const options = [String(answer), ...pickDistractors(pool, answer, 3, seed)];
    const ranked = options
      .map((value, index) => ({ value, score: hashString(`choice|${seed}|${index}|${value}`) }))
      .sort((left, right) => left.score - right.score || left.value.localeCompare(right.value));
    const choices = ranked.map((entry) => entry.value);
    return {
      choices,
      answerIndex: choices.findIndex((value) => normalize(value) === normalize(answer)),
    };
  }

  const WORLD_CAPITALS = [
    ["Argentina", "Buenos Aires"], ["Australia", "Canberra"], ["Austria", "Vienna"], ["Belgium", "Brussels"],
    ["Brazil", "Brasilia"], ["Canada", "Ottawa"], ["Chile", "Santiago"], ["China", "Beijing"],
    ["Colombia", "Bogota"], ["Czech Republic", "Prague"], ["Denmark", "Copenhagen"], ["Egypt", "Cairo"],
    ["Finland", "Helsinki"], ["France", "Paris"], ["Germany", "Berlin"], ["Greece", "Athens"],
    ["Hungary", "Budapest"], ["Iceland", "Reykjavik"], ["India", "New Delhi"], ["Indonesia", "Jakarta"],
    ["Ireland", "Dublin"], ["Italy", "Rome"], ["Japan", "Tokyo"], ["Kenya", "Nairobi"],
    ["Malaysia", "Kuala Lumpur"], ["Mexico", "Mexico City"], ["Netherlands", "Amsterdam"], ["New Zealand", "Wellington"],
    ["Nigeria", "Abuja"], ["Norway", "Oslo"], ["Peru", "Lima"], ["Philippines", "Manila"],
    ["Poland", "Warsaw"], ["Portugal", "Lisbon"], ["South Korea", "Seoul"], ["Spain", "Madrid"],
    ["Sweden", "Stockholm"], ["Switzerland", "Bern"], ["Thailand", "Bangkok"], ["Vietnam", "Hanoi"]
  ];

  const LANDMARK_COUNTRIES = [
    ["Taj Mahal", "India"], ["Machu Picchu", "Peru"], ["Great Barrier Reef", "Australia"], ["Petra", "Jordan"],
    ["Angkor Wat", "Cambodia"], ["Christ the Redeemer", "Brazil"], ["Moai statues", "Chile"], ["Mount Fuji", "Japan"],
    ["Acropolis", "Greece"], ["Stonehenge", "United Kingdom"], ["Chichen Itza", "Mexico"], ["Blue Lagoon", "Iceland"],
    ["Banff National Park", "Canada"], ["Anne Frank House", "Netherlands"], ["Great Sphinx of Giza", "Egypt"]
  ];

  const GEOGRAPHY_FACTS = [
    ["The Sahara Desert is on which continent?", "Africa", "The Sahara stretches across North Africa."],
    ["The Amazon Rainforest lies mostly in which country?", "Brazil", "Most of the Amazon Rainforest is in Brazil."],
    ["Mount Everest is part of which mountain range?", "Himalayas", "Mount Everest sits in the Himalayas."],
    ["The Danube River flows into which sea?", "Black Sea", "The Danube empties into the Black Sea."],
    ["Uluru is found in which country?", "Australia", "Uluru is one of Australia's best-known landmarks."],
    ["The Andes run along the western edge of which continent?", "South America", "The Andes define much of western South America."],
    ["Which ocean lies between Africa and Australia?", "Indian Ocean", "The Indian Ocean lies between Africa and Australia."],
    ["The Strait of Gibraltar separates Spain from which African country?", "Morocco", "Spain and Morocco face each other across the strait."],
    ["Patagonia is shared by Argentina and which other country?", "Chile", "Patagonia stretches across Argentina and Chile."],
    ["Mount Kilimanjaro stands in which country?", "Tanzania", "Kilimanjaro rises in Tanzania."],
    ["The Mekong River empties into the sea in which country?", "Vietnam", "The Mekong Delta is in southern Vietnam."],
    ["Lake Victoria borders Uganda, Kenya, and which third country?", "Tanzania", "Lake Victoria is shared by Uganda, Kenya, and Tanzania."]
  ];

  const SCIENCE_ELEMENT_SYMBOLS = [
    ["Hydrogen", "H"], ["Helium", "He"], ["Lithium", "Li"], ["Carbon", "C"], ["Nitrogen", "N"],
    ["Oxygen", "O"], ["Sodium", "Na"], ["Magnesium", "Mg"], ["Aluminum", "Al"], ["Silicon", "Si"],
    ["Phosphorus", "P"], ["Sulfur", "S"], ["Potassium", "K"], ["Calcium", "Ca"], ["Iron", "Fe"],
    ["Copper", "Cu"], ["Zinc", "Zn"], ["Silver", "Ag"], ["Gold", "Au"], ["Mercury", "Hg"],
    ["Lead", "Pb"], ["Neon", "Ne"], ["Chlorine", "Cl"], ["Nickel", "Ni"], ["Cobalt", "Co"],
    ["Uranium", "U"], ["Argon", "Ar"], ["Krypton", "Kr"], ["Titanium", "Ti"], ["Chromium", "Cr"],
    ["Manganese", "Mn"], ["Bromine", "Br"], ["Fluorine", "F"], ["Boron", "B"], ["Tin", "Sn"]
  ];

  const SCIENTIST_DISCOVERIES = [
    ["Isaac Newton", "the law of gravity"], ["Albert Einstein", "the theory of relativity"], ["Charles Darwin", "natural selection"], ["Marie Curie", "radioactivity research"],
    ["Louis Pasteur", "pasteurization and germ theory"], ["Gregor Mendel", "the basics of genetics"], ["Alexander Fleming", "penicillin"], ["Dmitri Mendeleev", "the periodic table"],
    ["Nikola Tesla", "alternating current systems"], ["Galileo Galilei", "telescopic study of Jupiter's moons"], ["Jane Goodall", "chimpanzee field research"], ["Rosalind Franklin", "X-ray images that helped reveal DNA structure"],
    ["Katherine Johnson", "orbital calculations for NASA missions"], ["Alan Turing", "the foundations of modern computer science"], ["Nicolaus Copernicus", "the heliocentric model"]
  ];

  const SCIENCE_FACTS = [
    ["What process do plants use to turn sunlight into chemical energy?", "Photosynthesis", "Photosynthesis lets plants turn sunlight into stored energy."],
    ["What process turns water vapor into liquid water?", "Condensation", "Condensation is the cooling of vapor into liquid."],
    ["What is the largest planet in our solar system?", "Jupiter", "Jupiter is the largest planet in the solar system."],
    ["Which planet is often called the Red Planet?", "Mars", "Mars looks red because of iron oxide on its surface."],
    ["Which planet is hottest on average in our solar system?", "Venus", "Venus is hotter than Mercury because of its dense atmosphere."],
    ["What is the closest star to Earth?", "Sun", "The Sun is Earth's local star."],
    ["What part of a cell contains most of its DNA?", "Nucleus", "The nucleus stores most cellular DNA."],
    ["What gas do humans need to breathe in order to survive?", "Oxygen", "Humans rely on oxygen for cellular respiration."],
    ["What gas do plants take in for photosynthesis?", "Carbon dioxide", "Plants absorb carbon dioxide during photosynthesis."],
    ["What force keeps planets in orbit around stars?", "Gravity", "Gravity pulls planets toward stars while their motion keeps them orbiting."],
    ["What instrument is used to look at very small objects like cells?", "Microscope", "Microscopes magnify tiny objects."],
    ["What galaxy contains our solar system?", "Milky Way", "Our solar system sits in the Milky Way."],
    ["A light-year measures what kind of quantity?", "Distance", "A light-year measures distance, not time."],
    ["What do meteorologists study?", "Weather", "Meteorology is the science of weather."],
    ["What process changes liquid water into water vapor?", "Evaporation", "Evaporation turns liquid water into vapor."],
    ["What giant pieces of Earth's crust slowly move and cause earthquakes and volcanoes?", "Tectonic plates", "Earth's tectonic plates shift over time."],
    ["What vessel pumps blood throughout the human body?", "Heart", "The heart is the body's main pump."],
    ["What branch of science studies living things?", "Biology", "Biology is the study of life."]
  ];

  const MUSIC_ARTIST_SONGS = [
    ["Queen", "Bohemian Rhapsody"], ["Michael Jackson", "Billie Jean"], ["Whitney Houston", "I Wanna Dance with Somebody"], ["Prince", "Purple Rain"],
    ["Madonna", "Like a Prayer"], ["Journey", "Don't Stop Believin'"], ["Nirvana", "Smells Like Teen Spirit"], ["ABBA", "Dancing Queen"],
    ["Elton John", "Tiny Dancer"], ["Bon Jovi", "Livin' on a Prayer"], ["The Beatles", "Hey Jude"], ["Adele", "Rolling in the Deep"],
    ["Taylor Swift", "Love Story"], ["Outkast", "Hey Ya!"], ["Fleetwood Mac", "Landslide"], ["Dolly Parton", "Jolene"],
    ["U2", "Beautiful Day"], ["Earth, Wind & Fire", "September"], ["The Killers", "Mr. Brightside"], ["Aretha Franklin", "Respect"],
    ["Bee Gees", "Stayin' Alive"], ["Beyonce", "Single Ladies"], ["Johnny Cash", "Ring of Fire"], ["a-ha", "Take On Me"],
    ["Guns N' Roses", "Sweet Child o' Mine"], ["Eagles", "Hotel California"], ["Lady Gaga", "Poker Face"], ["Rihanna", "Umbrella"],
    ["David Bowie", "Space Oddity"], ["Dua Lipa", "Levitating"]
  ];

  const MUSIC_COMPOSER_WORKS = [
    ["Beethoven", "Fifth Symphony"], ["Mozart", "The Magic Flute"], ["Tchaikovsky", "The Nutcracker"], ["Vivaldi", "The Four Seasons"],
    ["Bizet", "Carmen"], ["Gershwin", "Rhapsody in Blue"], ["Handel", "Messiah"], ["Debussy", "Clair de Lune"],
    ["Wagner", "Ride of the Valkyries"], ["Rossini", "The Barber of Seville"], ["Johann Strauss II", "The Blue Danube"], ["Puccini", "La Boheme"],
    ["Dvorak", "New World Symphony"], ["Copland", "Appalachian Spring"], ["Mendelssohn", "Wedding March"], ["Ravel", "Bolero"]
  ];
  const MUSIC_INSTRUMENT_FAMILIES = [
    ["Violin", "String"], ["Cello", "String"], ["Flute", "Woodwind"], ["Clarinet", "Woodwind"], ["Trumpet", "Brass"],
    ["Trombone", "Brass"], ["Tuba", "Brass"], ["Oboe", "Woodwind"], ["Bassoon", "Woodwind"], ["Saxophone", "Woodwind"],
    ["French horn", "Brass"], ["Harp", "String"], ["Timpani", "Percussion"], ["Xylophone", "Percussion"], ["Piano", "Keyboard"]
  ];

  const MUSIC_ALBUM_ARTISTS = [
    ["Thriller", "Michael Jackson"], ["Rumours", "Fleetwood Mac"], ["21", "Adele"], ["Abbey Road", "The Beatles"],
    ["Back to Black", "Amy Winehouse"], ["Born in the U.S.A.", "Bruce Springsteen"], ["Jagged Little Pill", "Alanis Morissette"], ["Nevermind", "Nirvana"],
    ["The Joshua Tree", "U2"], ["Lemonade", "Beyonce"], ["Tapestry", "Carole King"], ["Back in Black", "AC/DC"],
    ["Fearless", "Taylor Swift"], ["Future Nostalgia", "Dua Lipa"]
  ];

  const SPORTS_ATHLETE_SPORTS = [
    ["Serena Williams", "Tennis"], ["LeBron James", "Basketball"], ["Tom Brady", "Football"], ["Lionel Messi", "Soccer"],
    ["Simone Biles", "Gymnastics"], ["Michael Phelps", "Swimming"], ["Tiger Woods", "Golf"], ["Shohei Ohtani", "Baseball"],
    ["Novak Djokovic", "Tennis"], ["Connor McDavid", "Ice hockey"], ["Katie Ledecky", "Swimming"], ["Stephen Curry", "Basketball"],
    ["Patrick Mahomes", "Football"], ["Coco Gauff", "Tennis"], ["Usain Bolt", "Track and field"], ["Sidney Crosby", "Ice hockey"],
    ["Alex Morgan", "Soccer"], ["Aaron Judge", "Baseball"], ["Max Verstappen", "Formula 1"], ["Lewis Hamilton", "Formula 1"],
    ["Megan Rapinoe", "Soccer"], ["Wayne Gretzky", "Ice hockey"], ["Mia Hamm", "Soccer"], ["Luka Doncic", "Basketball"], ["Peyton Manning", "Football"]
  ];

  const SPORTS_TEAMS = [
    ["Yankees", "New York", "MLB"], ["Red Sox", "Boston", "MLB"], ["Cubs", "Chicago", "MLB"], ["Dodgers", "Los Angeles", "MLB"],
    ["Braves", "Atlanta", "MLB"], ["Phillies", "Philadelphia", "MLB"], ["Lakers", "Los Angeles", "NBA"], ["Celtics", "Boston", "NBA"],
    ["Bulls", "Chicago", "NBA"], ["Knicks", "New York", "NBA"], ["Heat", "Miami", "NBA"], ["Raptors", "Toronto", "NBA"],
    ["Packers", "Green Bay", "NFL"], ["Chiefs", "Kansas City", "NFL"], ["Cowboys", "Dallas", "NFL"], ["Eagles", "Philadelphia", "NFL"],
    ["Canadiens", "Montreal", "NHL"], ["Maple Leafs", "Toronto", "NHL"]
  ];

  const SPORTS_TROPHIES = [
    ["Stanley Cup", "Ice hockey"], ["Vince Lombardi Trophy", "Football"], ["Larry O'Brien Championship Trophy", "Basketball"], ["Commissioner's Trophy", "Baseball"],
    ["FIFA World Cup", "Soccer"], ["Green Jacket", "Golf"], ["Heisman Trophy", "College football"], ["Davis Cup", "Tennis"],
    ["Tour de France", "Cycling"], ["Kentucky Derby", "Horse racing"]
  ];

  const SPORTS_TERMS = [
    ["Hat trick", "three goals or scores by the same player in one game"], ["Home run", "a baseball hit that lets the batter circle all the bases"], ["Touchdown", "a six-point scoring play in American football"], ["Birdie", "one stroke under par on a golf hole"],
    ["Ace", "a tennis serve that is not returned"], ["Power play", "a hockey advantage created by an opponent's penalty"], ["Penalty kick", "a direct soccer shot taken from the spot"], ["Fast break", "a quick transition attack in basketball"],
    ["Slam dunk", "a basketball shot thrown down through the hoop"], ["Walk-off", "a game-ending hit or score by the home team"], ["Pole position", "the front starting spot in a race"], ["Clean sheet", "a game with no goals allowed"],
    ["Free throw", "an unguarded basketball shot worth one point"], ["Faceoff", "the method used to start play in hockey"], ["Hole in one", "putting a golf ball in the cup with one stroke"]
  ];

  const SCREEN_CHARACTERS = [
    ["Darth Vader", "Star Wars"], ["Hermione Granger", "Harry Potter"], ["Buzz Lightyear", "Toy Story"], ["Elsa", "Frozen"], ["Shrek", "Shrek"],
    ["Katniss Everdeen", "The Hunger Games"], ["Walter White", "Breaking Bad"], ["Ted Lasso", "Ted Lasso"], ["Rachel Green", "Friends"], ["Michael Scott", "The Office"],
    ["Daenerys Targaryen", "Game of Thrones"], ["Moana", "Moana"], ["Marty McFly", "Back to the Future"], ["Jack Sparrow", "Pirates of the Caribbean"], ["SpongeBob SquarePants", "SpongeBob SquarePants"],
    ["Leslie Knope", "Parks and Recreation"], ["Eleven", "Stranger Things"], ["Neo", "The Matrix"], ["Simba", "The Lion King"], ["Rocky Balboa", "Rocky"],
    ["Elle Woods", "Legally Blonde"], ["Wednesday Addams", "Wednesday"], ["Tony Soprano", "The Sopranos"], ["Indiana Jones", "Indiana Jones"], ["Forrest Gump", "Forrest Gump"]
  ];

  const SCREEN_ACTOR_ROLES = [
    ["Daniel Radcliffe", "Harry Potter", "Harry Potter"], ["Emma Watson", "Hermione Granger", "Harry Potter"], ["Harrison Ford", "Indiana Jones", "Indiana Jones"], ["Robert Downey Jr.", "Iron Man", "the Marvel films"],
    ["Carrie Fisher", "Princess Leia", "Star Wars"], ["Bryan Cranston", "Walter White", "Breaking Bad"], ["Jennifer Lawrence", "Katniss Everdeen", "The Hunger Games"], ["Chris Evans", "Captain America", "the Marvel films"],
    ["Keanu Reeves", "Neo", "The Matrix"], ["Tom Hanks", "Forrest Gump", "Forrest Gump"], ["Steve Carell", "Michael Scott", "The Office"], ["Millie Bobby Brown", "Eleven", "Stranger Things"],
    ["Pedro Pascal", "Din Djarin", "The Mandalorian"], ["Johnny Depp", "Captain Jack Sparrow", "Pirates of the Caribbean"], ["James Gandolfini", "Tony Soprano", "The Sopranos"], ["Julie Andrews", "Mary Poppins", "Mary Poppins"],
    ["Arnold Schwarzenegger", "the Terminator", "The Terminator"], ["Mark Hamill", "Luke Skywalker", "Star Wars"], ["Sigourney Weaver", "Ellen Ripley", "Alien"], ["Macaulay Culkin", "Kevin McCallister", "Home Alone"]
  ];

  const SCREEN_DIRECTORS = [
    ["Jurassic Park", "Steven Spielberg"], ["Inception", "Christopher Nolan"], ["Lady Bird", "Greta Gerwig"], ["Pulp Fiction", "Quentin Tarantino"],
    ["Goodfellas", "Martin Scorsese"], ["Titanic", "James Cameron"], ["Spirited Away", "Hayao Miyazaki"], ["Get Out", "Jordan Peele"],
    ["Wonder Woman", "Patty Jenkins"], ["Gladiator", "Ridley Scott"], ["The Lord of the Rings trilogy", "Peter Jackson"], ["The Princess Bride", "Rob Reiner"]
  ];

  const SCREEN_SHOW_CLUES = [
    ["Which show follows the employees of Dunder Mifflin in Scranton?", "The Office", "The Office is set around the Dunder Mifflin branch in Scranton."],
    ["Which sitcom is about six friends who spend time at Central Perk?", "Friends", "Friends made Central Perk a pop-culture landmark."],
    ["Which comedy follows teachers working at Abbott Elementary?", "Abbott Elementary", "Abbott Elementary is set inside the school of the same name."],
    ["Which drama follows a chemistry teacher who becomes a meth kingpin?", "Breaking Bad", "Breaking Bad follows Walter White's descent into crime."],
    ["Which comedy is set in the Pawnee parks department?", "Parks and Recreation", "Parks and Recreation takes place in the local government of Pawnee."],
    ["Which fantasy series revolves around dragons and the Iron Throne?", "Game of Thrones", "Game of Thrones made the Iron Throne its central symbol."],
    ["Which series follows an American football coach working with a London soccer club?", "Ted Lasso", "Ted Lasso sends a Kansas football coach to London."],
    ["Which medical drama began at Seattle Grace Hospital?", "Grey's Anatomy", "Grey's Anatomy started at Seattle Grace."],
    ["Which mystery series begins with plane crash survivors on a strange island?", "Lost", "Lost starts with Oceanic Flight 815 crashing on a mysterious island."],
    ["Which animated sitcom follows a family living in Springfield?", "The Simpsons", "The Simpsons is famously set in Springfield."],
    ["Which zombie drama follows survivors in a post-apocalyptic America?", "The Walking Dead", "The Walking Dead follows survivors after a zombie outbreak."],
    ["Which show features students at Nevermore Academy and a deadpan detective heroine?", "Wednesday", "Wednesday follows Wednesday Addams at Nevermore Academy."]
  ];

  const HISTORY_EVENT_YEARS = [
    ["the Norman Conquest at the Battle of Hastings", "1066"], ["the signing of the Magna Carta", "1215"], ["Columbus reaching the Americas", "1492"], ["Martin Luther posting the Ninety-Five Theses", "1517"],
    ["the Declaration of Independence being adopted", "1776"], ["the French Revolution beginning", "1789"], ["the American Civil War beginning", "1861"], ["the Titanic sinking", "1912"],
    ["World War I beginning", "1914"], ["the Nineteenth Amendment being ratified in the United States", "1920"], ["the Wall Street Crash of Black Tuesday", "1929"], ["the attack on Pearl Harbor", "1941"],
    ["the D-Day landings", "1944"], ["World War II ending", "1945"], ["Rosa Parks refusing to give up her bus seat", "1955"], ["the March on Washington and 'I Have a Dream' speech", "1963"],
    ["the Apollo 11 moon landing", "1969"], ["the fall of the Berlin Wall", "1989"]
  ];

  const HISTORY_FIGURES = [
    ["Which leader is known for guiding India toward independence through nonviolent resistance?", "Mahatma Gandhi", "Mahatma Gandhi became the most recognized face of nonviolent Indian independence."],
    ["Which nurse became famous as the 'Lady with the Lamp'?", "Florence Nightingale", "Florence Nightingale's work made her a legend in nursing."],
    ["Who was the first president of the United States?", "George Washington", "George Washington became the first U.S. president in 1789."],
    ["Which abolitionist escaped slavery and later led people to freedom on the Underground Railroad?", "Harriet Tubman", "Harriet Tubman became one of the Underground Railroad's most famous conductors."],
    ["Which civil rights leader delivered the 'I Have a Dream' speech?", "Martin Luther King Jr.", "Martin Luther King Jr. gave the speech during the March on Washington."],
    ["Which Egyptian queen formed political alliances with Julius Caesar and Mark Antony?", "Cleopatra", "Cleopatra was the last active ruler of the Ptolemaic Kingdom of Egypt."],
    ["Which South African leader became president after apartheid ended?", "Nelson Mandela", "Nelson Mandela became South Africa's first Black president in 1994."],
    ["Which French military leader crowned himself emperor in 1804?", "Napoleon Bonaparte", "Napoleon Bonaparte rose from general to emperor of France."],
    ["Which Mongol ruler founded the largest contiguous land empire in history?", "Genghis Khan", "Genghis Khan united the Mongol tribes and launched a vast empire."],
    ["Which British prime minister led the United Kingdom through most of World War II?", "Winston Churchill", "Winston Churchill became the public face of Britain's wartime resistance."],
    ["Which aviator became the first woman to fly solo across the Atlantic Ocean?", "Amelia Earhart", "Amelia Earhart's solo Atlantic flight cemented her fame."],
    ["Which Roman general famously crossed the Rubicon?", "Julius Caesar", "Crossing the Rubicon became shorthand for taking an irreversible step."],
    ["Which pharaoh's tomb was discovered nearly intact in 1922?", "Tutankhamun", "Tutankhamun's tomb became a symbol of ancient Egypt's enduring fascination."],
    ["Which political philosopher co-wrote The Communist Manifesto with Friedrich Engels?", "Karl Marx", "Karl Marx helped shape modern socialist thought."],
    ["Which Macedonian king built a vast empire before the age of 33?", "Alexander the Great", "Alexander the Great conquered territory stretching from Greece to India."],
    ["Which long-reigning British monarch gave her name to the Victorian era?", "Queen Victoria", "Queen Victoria's reign defined much of nineteenth-century Britain."],
    ["Which U.S. president led the nation during the Civil War?", "Abraham Lincoln", "Abraham Lincoln preserved the Union during the Civil War."],
    ["Which statesman and inventor appears on the U.S. one-hundred-dollar bill?", "Benjamin Franklin", "Benjamin Franklin remains one of the best-known founders."],
    ["Which ruler became the first emperor of a unified China?", "Qin Shi Huang", "Qin Shi Huang unified warring states into imperial China."],
    ["Which famous sharpshooter starred in Buffalo Bill's Wild West show?", "Annie Oakley", "Annie Oakley became one of the most famous entertainers of the American West."]
  ];
  const HISTORY_TERMS = [
    ["Renaissance", "the rebirth of art, science, and learning in Europe after the Middle Ages"], ["Industrial Revolution", "the period of rapid factory growth and mechanization"], ["Cold War", "the long rivalry between the United States and the Soviet Union"], ["Manifest Destiny", "the belief that the United States was meant to expand westward"],
    ["Suffrage", "the right to vote"], ["Armistice", "an agreement to stop fighting"], ["Apartheid", "South Africa's system of racial segregation"], ["Feudalism", "a social system built on landholding and mutual obligations"],
    ["Monarchy", "a government ruled by a king or queen"], ["Democracy", "a system in which power rests with the people"], ["Prohibition", "the era when alcohol was banned in the United States"], ["Treaty", "a formal agreement between nations"],
    ["Colonization", "the process of settling and controlling another land"], ["Reformation", "the religious movement that split western Christianity in the sixteenth century"], ["Imperialism", "a policy of extending power over other lands"]
  ];

  const US_PRESIDENT_FACTS = [
    ["Which U.S. president appears on the penny?", "Abraham Lincoln", "Abraham Lincoln appears on the penny and the five-dollar bill."],
    ["Which U.S. president served more than two terms?", "Franklin D. Roosevelt", "Franklin D. Roosevelt was elected to four terms."],
    ["Which president is associated with the Louisiana Purchase?", "Thomas Jefferson", "Thomas Jefferson oversaw the Louisiana Purchase in 1803."],
    ["Which president launched the New Deal?", "Franklin D. Roosevelt", "The New Deal was Franklin D. Roosevelt's response to the Great Depression."],
    ["Which president resigned because of the Watergate scandal?", "Richard Nixon", "Richard Nixon resigned in 1974."],
    ["Which president was known as the Great Emancipator?", "Abraham Lincoln", "Abraham Lincoln issued the Emancipation Proclamation during the Civil War."],
    ["Which former actor told the Soviet Union to 'tear down this wall'?", "Ronald Reagan", "Ronald Reagan delivered the line in Berlin in 1987."],
    ["Which president commanded Allied forces in Europe before entering the White House?", "Dwight D. Eisenhower", "Dwight D. Eisenhower served as supreme commander during World War II."],
    ["Which president was never elected president or vice president?", "Gerald Ford", "Gerald Ford became vice president and then president through succession."],
    ["Which president is tied to the Monroe Doctrine?", "James Monroe", "The Monroe Doctrine was announced during James Monroe's presidency."]
  ];

  const ANCIENT_FACTS = [
    ["The Parthenon in Athens was dedicated to which goddess?", "Athena", "The Parthenon honored Athena, patron goddess of Athens."],
    ["The Colosseum is located in which city?", "Rome", "The Colosseum is one of Rome's most famous landmarks."],
    ["The Rosetta Stone helped scholars decode which writing system?", "Hieroglyphics", "The Rosetta Stone was key to deciphering Egyptian hieroglyphics."],
    ["The ancient Olympic Games began in which country?", "Greece", "The original Olympic Games were held in ancient Greece."],
    ["The Hanging Gardens are traditionally associated with which ancient city?", "Babylon", "The Hanging Gardens are one of the classic wonders of the ancient world."],
    ["The Terracotta Army guards the tomb of which ruler?", "Qin Shi Huang", "The Terracotta Army was built for China's first emperor."],
    ["Machu Picchu was built by which civilization?", "Inca", "Machu Picchu is a monumental site of the Inca civilization."],
    ["The pyramids at Giza were built as tombs for whom?", "Pharaohs", "The Giza pyramids were royal tombs for pharaohs."],
    ["Latin was the main language of which empire?", "Roman Empire", "Latin spread across the Roman Empire."],
    ["The Silk Road mainly connected China with what larger region?", "Europe", "The Silk Road linked East Asia with Europe through Central Asia."]
  ];

  function buildQuestionBank() {
    const questions = [];
    const ids = new Set();

    function push(category, key, prompt, answer, pool, explanation) {
      const choicePack = buildChoices(answer, pool, `${category}|${key}|${prompt}`);
      let id = `${slugify(category)}-${slugify(key)}`;
      let suffix = 2;
      while (ids.has(id)) {
        id = `${slugify(category)}-${slugify(key)}-${suffix}`;
        suffix += 1;
      }
      ids.add(id);
      questions.push({
        id,
        category,
        difficulty: DIFFICULTY,
        prompt,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explanation,
      });
    }

    const countries = WORLD_CAPITALS.map(([country]) => country);
    const capitals = WORLD_CAPITALS.map(([, capital]) => capital);
    WORLD_CAPITALS.forEach(([country, capital]) => {
      push("Geography", `${country}-capital`, `What is the capital of ${country}?`, capital, capitals, `${capital} is the capital city of ${country}.`);
      push("Geography", `${capital}-country`, `${capital} is the capital of which country?`, country, countries, `${capital} serves as the capital of ${country}.`);
    });
    LANDMARK_COUNTRIES.forEach(([landmark, country]) => {
      push("Geography", `${landmark}-country`, `${landmark} is located in which country?`, country, countries.concat(LANDMARK_COUNTRIES.map(([, value]) => value)), `${landmark} is one of the best-known landmarks in ${country}.`);
    });
    GEOGRAPHY_FACTS.forEach(([prompt, answer, explanation]) => {
      push("Geography", prompt, prompt, answer, GEOGRAPHY_FACTS.map(([, value]) => value), explanation);
    });

    const elements = SCIENCE_ELEMENT_SYMBOLS.map(([element]) => element);
    const symbols = SCIENCE_ELEMENT_SYMBOLS.map(([, symbol]) => symbol);
    SCIENCE_ELEMENT_SYMBOLS.forEach(([element, symbol]) => {
      push("Science", `${element}-symbol`, `What is the chemical symbol for ${element}?`, symbol, symbols, `${symbol} is the chemical symbol for ${element}.`);
      push("Science", `${symbol}-element`, `Which element uses the chemical symbol ${symbol}?`, element, elements, `${element} is represented by the symbol ${symbol}.`);
    });
    SCIENTIST_DISCOVERIES.forEach(([scientist, discovery]) => {
      push("Science", `${scientist}-discovery`, `${scientist} is best known for which discovery or research area?`, discovery, SCIENTIST_DISCOVERIES.map(([, value]) => value), `${scientist} is strongly associated with ${discovery}.`);
    });
    SCIENCE_FACTS.forEach(([prompt, answer, explanation]) => {
      push("Science", prompt, prompt, answer, SCIENCE_FACTS.map(([, value]) => value), explanation);
    });

    const artists = MUSIC_ARTIST_SONGS.map(([artist]) => artist);
    const songs = MUSIC_ARTIST_SONGS.map(([, song]) => song);
    MUSIC_ARTIST_SONGS.forEach(([artist, song]) => {
      push("Music", `${artist}-song`, `Which artist recorded \"${song}\"?`, artist, artists, `\"${song}\" is closely associated with ${artist}.`);
      push("Music", `${song}-artist`, `Which song is most closely associated with ${artist}?`, song, songs, `${artist} is widely known for \"${song}\".`);
    });
    MUSIC_COMPOSER_WORKS.forEach(([composer, work]) => {
      push("Music", `${composer}-work`, `Which composer wrote ${work}?`, composer, MUSIC_COMPOSER_WORKS.map(([value]) => value), `${work} is one of ${composer}'s best-known pieces.`);
    });
    MUSIC_INSTRUMENT_FAMILIES.forEach(([instrument, family]) => {
      push("Music", `${instrument}-family`, `${instrument} belongs to which instrument family?`, family, unique(MUSIC_INSTRUMENT_FAMILIES.map(([, value]) => value)), `${instrument} is part of the ${family.toLowerCase()} family.`);
    });
    MUSIC_ALBUM_ARTISTS.forEach(([album, artist]) => {
      push("Music", `${album}-artist`, `Who released the album ${album}?`, artist, MUSIC_ALBUM_ARTISTS.map(([, value]) => value), `${album} is an album by ${artist}.`);
    });

    SPORTS_ATHLETE_SPORTS.forEach(([athlete, sport]) => {
      push("Sports", `${athlete}-sport`, `${athlete} is best known for which sport?`, sport, SPORTS_ATHLETE_SPORTS.map(([, value]) => value), `${athlete} is a star in ${sport.toLowerCase()}.`);
    });
    SPORTS_TEAMS.forEach(([team, city, league]) => {
      push("Sports", `${team}-city`, `The ${team} are based in which city?`, city, SPORTS_TEAMS.map(([, value]) => value), `The ${team} play in ${city}.`);
      push("Sports", `${league}-${city}-team`, `Which ${league} team plays in ${city}?`, team, SPORTS_TEAMS.map(([value]) => value), `In the ${league}, ${city} is home to the ${team}.`);
    });
    SPORTS_TROPHIES.forEach(([trophy, sport]) => {
      push("Sports", `${trophy}-sport`, `${trophy} is awarded in which sport or event?`, sport, SPORTS_TROPHIES.map(([, value]) => value), `${trophy} is associated with ${sport.toLowerCase()}.`);
    });
    SPORTS_TERMS.forEach(([term, definition]) => {
      push("Sports", `${term}-definition`, `Which sports term means ${definition}?`, term, SPORTS_TERMS.map(([value]) => value), `${term} means ${definition}.`);
    });

    const works = SCREEN_CHARACTERS.map(([, work]) => work);
    const characters = SCREEN_CHARACTERS.map(([character]) => character);
    SCREEN_CHARACTERS.forEach(([character, work]) => {
      push("Movies & TV", `${character}-work`, `${character} is a character from which movie or series?`, work, works, `${character} belongs to ${work}.`);
      push("Movies & TV", `${work}-character-${character}`, `Which of these characters comes from ${work}?`, character, characters, `${character} is a character from ${work}.`);
    });
    SCREEN_ACTOR_ROLES.forEach(([actor, role, work]) => {
      push("Movies & TV", `${role}-actor`, `Who played ${role} in ${work}?`, actor, SCREEN_ACTOR_ROLES.map(([value]) => value), `${role} was played by ${actor} in ${work}.`);
    });
    SCREEN_DIRECTORS.forEach(([film, director]) => {
      push("Movies & TV", `${film}-director`, `Who directed ${film}?`, director, SCREEN_DIRECTORS.map(([, value]) => value), `${director} directed ${film}.`);
    });
    SCREEN_SHOW_CLUES.forEach(([prompt, answer, explanation]) => {
      push("Movies & TV", prompt, prompt, answer, SCREEN_SHOW_CLUES.map(([, value]) => value), explanation);
    });

    const years = HISTORY_EVENT_YEARS.map(([, year]) => year);
    const events = HISTORY_EVENT_YEARS.map(([event]) => event);
    HISTORY_EVENT_YEARS.forEach(([event, year]) => {
      push("History", `${event}-year`, `In what year did ${event} happen?`, year, years, `${event} happened in ${year}.`);
    });
    HISTORY_EVENT_YEARS.slice(0, 8).forEach(([event, year]) => {
      push("History", `${year}-event`, `Which of these events happened in ${year}?`, event, events, `${event} is tied to the year ${year}.`);
    });
    HISTORY_FIGURES.forEach(([prompt, answer, explanation]) => {
      push("History", prompt, prompt, answer, HISTORY_FIGURES.map(([, value]) => value), explanation);
    });
    HISTORY_TERMS.forEach(([term, definition]) => {
      push("History", `${term}-definition`, `Which historical term means ${definition}?`, term, HISTORY_TERMS.map(([value]) => value), `${term} means ${definition}.`);
    });
    US_PRESIDENT_FACTS.forEach(([prompt, answer, explanation]) => {
      push("History", prompt, prompt, answer, unique(US_PRESIDENT_FACTS.map(([, value]) => value)), explanation);
    });
    ANCIENT_FACTS.forEach(([prompt, answer, explanation]) => {
      push("History", prompt, prompt, answer, ANCIENT_FACTS.map(([, value]) => value), explanation);
    });

    return questions;
  }

  const bank = buildQuestionBank();
  window.PAIDEN_TRIVIA_BANK_VERSION = VERSION;
  window.PAIDEN_TRIVIA_QUESTION_BANK = bank;
})();
