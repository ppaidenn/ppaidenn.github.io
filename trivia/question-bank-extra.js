(function () {
  "use strict";

  const bank = window.PAIDEN_TRIVIA_QUESTION_BANK;
  if (!Array.isArray(bank)) return;

  const existingIds = new Set(bank.map(function (question) { return question.id; }));

  function normalize(value) {
    return String(value).trim().toLowerCase();
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function unique(values) {
    const seen = new Set();
    return values.filter(function (value) {
      const key = normalize(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function buildChoices(answer, pool, seed) {
    const options = unique(pool).filter(function (value) { return normalize(value) !== normalize(answer); })
      .map(function (value, index) { return { value: String(value), score: hashString(`${seed}|${index}|${value}`) }; })
      .sort(function (left, right) { return left.score - right.score || left.value.localeCompare(right.value); })
      .slice(0, 3)
      .map(function (entry) { return entry.value; });
    options.push(String(answer));
    const choices = options.map(function (value, index) { return { value, score: hashString(`choice|${seed}|${index}|${value}`) }; })
      .sort(function (left, right) { return left.score - right.score || left.value.localeCompare(right.value); })
      .map(function (entry) { return entry.value; });
    return { choices, answerIndex: choices.findIndex(function (value) { return normalize(value) === normalize(answer); }) };
  }

  function add(category, key, prompt, answer, pool, explanation) {
    let id = `challenge-${slugify(category)}-${slugify(key)}`;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `challenge-${slugify(category)}-${slugify(key)}-${suffix}`;
      suffix += 1;
    }
    existingIds.add(id);
    const choicePack = buildChoices(answer, pool, id);
    bank.push({ id, category, difficulty: "classic", tier: "challenge", prompt, choices: choicePack.choices, answerIndex: choicePack.answerIndex, explanation });
  }

  function addPairs(category, pairs, forward, reverse, explanation, forwardAnswerSide = "right") {
    const leftPool = pairs.map(function (pair) { return pair[0]; });
    const rightPool = pairs.map(function (pair) { return pair[1]; });
    pairs.forEach(function (pair) {
      const left = pair[0];
      const right = pair[1];
      const forwardAnswer = forwardAnswerSide === "left" ? left : right;
      const forwardPool = forwardAnswerSide === "left" ? leftPool : rightPool;
      const reverseAnswer = forwardAnswerSide === "left" ? right : left;
      const reversePool = forwardAnswerSide === "left" ? rightPool : leftPool;
      add(category, `${left}-to-${right}`, forward(left, right), forwardAnswer, forwardPool, explanation(left, right));
      add(category, `${right}-to-${left}`, reverse(left, right), reverseAnswer, reversePool, explanation(left, right));
    });
  }

  const GEOGRAPHY_PLACES = [
    ["Atacama Desert", "Chile"], ["Okavango Delta", "Botswana"], ["Salar de Uyuni", "Bolivia"], ["Wadi Rum", "Jordan"],
    ["Bagan", "Myanmar"], ["Plitvice Lakes", "Croatia"], ["Cappadocia", "Turkey"], ["Danakil Depression", "Ethiopia"],
    ["Zhangjiajie National Forest Park", "China"], ["Komodo National Park", "Indonesia"], ["Fiordland National Park", "New Zealand"], ["Meteora", "Greece"],
    ["Tikal", "Guatemala"], ["Teotihuacan", "Mexico"], ["Lake Baikal", "Russia"], ["Namib Desert", "Namibia"],
    ["Galapagos Islands", "Ecuador"], ["Socotra", "Yemen"], ["Mount Kinabalu", "Malaysia"], ["Mount Aconcagua", "Argentina"],
    ["Erg Chebbi", "Morocco"], ["Lake Bled", "Slovenia"], ["Mount Etna", "Italy"], ["Arenal Volcano", "Costa Rica"],
    ["Serengeti National Park", "Tanzania"], ["Hokkaido", "Japan"], ["Samarkand", "Uzbekistan"], ["Tsingy de Bemaraha", "Madagascar"],
    ["Jasper National Park", "Canada"], ["Rila Monastery", "Bulgaria"], ["Bwindi Impenetrable National Park", "Uganda"], ["Ha Long Bay", "Vietnam"],
    ["Canaima National Park", "Venezuela"], ["Purnululu National Park", "Australia"], ["Tara National Park", "Serbia"], ["Vatnajokull National Park", "Iceland"]
  ];
  const SCIENCE_ATOMIC_NUMBERS = [
    ["Beryllium", "4"], ["Boron", "5"], ["Neon", "10"], ["Silicon", "14"], ["Phosphorus", "15"], ["Argon", "18"],
    ["Scandium", "21"], ["Vanadium", "23"], ["Chromium", "24"], ["Manganese", "25"], ["Iron", "26"], ["Cobalt", "27"],
    ["Nickel", "28"], ["Copper", "29"], ["Zinc", "30"], ["Gallium", "31"], ["Germanium", "32"], ["Selenium", "34"],
    ["Bromine", "35"], ["Krypton", "36"], ["Rubidium", "37"], ["Strontium", "38"], ["Zirconium", "40"], ["Niobium", "41"],
    ["Molybdenum", "42"], ["Palladium", "46"], ["Silver", "47"], ["Cadmium", "48"], ["Indium", "49"], ["Tin", "50"],
    ["Iodine", "53"], ["Xenon", "54"], ["Cesium", "55"], ["Barium", "56"], ["Tungsten", "74"], ["Platinum", "78"]
  ];

  const MUSIC_ALBUMS = [
    ["Blue", "Joni Mitchell"], ["Graceland", "Paul Simon"], ["The Rise and Fall of Ziggy Stardust and the Spiders from Mars", "David Bowie"], ["A Love Supreme", "John Coltrane"],
    ["The Chronic", "Dr. Dre"], ["Illmatic", "Nas"], ["Songs in the Key of Life", "Stevie Wonder"], ["The Miseducation of Lauryn Hill", "Lauryn Hill"],
    ["What's Going On", "Marvin Gaye"], ["Pet Sounds", "The Beach Boys"], ["London Calling", "The Clash"], ["The Velvet Underground & Nico", "The Velvet Underground"],
    ["Hounds of Love", "Kate Bush"], ["OK Computer", "Radiohead"], ["To Pimp a Butterfly", "Kendrick Lamar"], ["The Dark Side of the Moon", "Pink Floyd"],
    ["Born to Run", "Bruce Springsteen"], ["The Queen Is Dead", "The Smiths"], ["The Blue Album", "Weezer"], ["Automatic for the People", "R.E.M."],
    ["Since I Left You", "The Avalanches"], ["Disintegration", "The Cure"], ["Homogenic", "Bjork"], ["The Low End Theory", "A Tribe Called Quest"],
    ["Channel Orange", "Frank Ocean"], ["The College Dropout", "Kanye West"], ["Ctrl", "SZA"], ["Fetch the Bolt Cutters", "Fiona Apple"],
    ["Dummy", "Portishead"], ["Dookie", "Green Day"], ["Blood on the Tracks", "Bob Dylan"], ["Horses", "Patti Smith"],
    ["The ArchAndroid", "Janelle Monae"], ["Sweet Baby James", "James Taylor"], ["AM", "Arctic Monkeys"], ["Let It Bleed", "The Rolling Stones"]
  ];

  const SPORTS_MOMENTS = [
    ["Wayne Gretzky", "the nickname The Great One"], ["Earvin Johnson", "the nickname Magic"], ["George Herman Ruth", "the nickname Babe"], ["Walter Payton", "the nickname Sweetness"],
    ["Jesse Owens", "four gold medals at the 1936 Berlin Olympics"], ["Nadia Comaneci", "the first Olympic perfect 10 in gymnastics"], ["Roger Bannister", "the first sub-four-minute mile"], ["Billie Jean King", "the Battle of the Sexes"],
    ["Jim Thorpe", "gold medals in the 1912 pentathlon and decathlon"], ["Jackie Robinson", "breaking Major League Baseball's color barrier"], ["Wilma Rudolph", "three track gold medals at the 1960 Olympics"], ["Mark Spitz", "seven swimming gold medals at the 1972 Olympics"],
    ["Carl Lewis", "four track and field gold medals at the 1984 Olympics"], ["Kerri Strug", "the injured vault at the 1996 Olympics"], ["Rulon Gardner", "defeating Aleksandr Karelin at the 2000 Olympics"], ["Eric Liddell", "the 400-meter gold medal at the 1924 Olympics"],
    ["Bob Beamon", "the 1968 long-jump world record"], ["Florence Griffith Joyner", "the women's 100-meter world record"], ["David Rudisha", "the 800-meter world record"], ["Michael Johnson", "the 200-meter and 400-meter double in 1996"],
    ["Jackie Joyner-Kersee", "the Olympic heptathlon record"], ["Althea Gibson", "becoming the first Black Wimbledon singles champion"], ["Arthur Ashe", "becoming the first Black men's Wimbledon champion"], ["Kristi Yamaguchi", "the 1992 Olympic figure-skating gold medal"],
    ["Apolo Ohno", "short-track speed skating medals at three Olympics"], ["Eddie Eagan", "gold medals at both the Summer and Winter Olympics in different sports"], ["Don Bradman", "a Test cricket batting average of 99.94"], ["Bjorn Borg", "five consecutive Wimbledon singles titles"],
    ["Steffi Graf", "the Golden Slam in 1988"], ["Larisa Latynina", "18 Olympic medals in gymnastics"], ["Hicham El Guerrouj", "the 1,500-meter and 5,000-meter double at Athens 2004"], ["Edwin Moses", "a 122-race winning streak in the 400-meter hurdles"],
    ["Dick Fosbury", "the Fosbury Flop high-jump technique"], ["Tony Hawk", "the first documented 900 in competition"], ["Pele", "winning three men's World Cups"], ["Miroslav Klose", "the men's World Cup finals goal record"]
  ];

  const SCREEN_QUOTES = [
    ["Here's looking at you, kid.", "Casablanca"], ["You can't handle the truth!", "A Few Good Men"], ["May the Force be with you.", "Star Wars"], ["I'm gonna make him an offer he can't refuse.", "The Godfather"],
    ["There's no place like home.", "The Wizard of Oz"], ["Why so serious?", "The Dark Knight"], ["E.T. phone home.", "E.T. the Extra-Terrestrial"], ["I see dead people.", "The Sixth Sense"],
    ["Show me the money!", "Jerry Maguire"], ["Keep your friends close, but your enemies closer.", "The Godfather Part II"], ["Life is like a box of chocolates.", "Forrest Gump"], ["I feel the need - the need for speed.", "Top Gun"],
    ["Nobody puts Baby in a corner.", "Dirty Dancing"], ["Roads? Where we're going, we don't need roads.", "Back to the Future"], ["You talkin' to me?", "Taxi Driver"], ["I'm the king of the world!", "Titanic"],
    ["Hasta la vista, baby.", "Terminator 2: Judgment Day"], ["Houston, we have a problem.", "Apollo 13"], ["I'm just a girl, standing in front of a boy, asking him to love her.", "Notting Hill"], ["To infinity and beyond!", "Toy Story"],
    ["Say hello to my little friend!", "Scarface"], ["The first rule of Fight Club is: you do not talk about Fight Club.", "Fight Club"], ["Carpe diem. Seize the day, boys.", "Dead Poets Society"], ["I love the smell of napalm in the morning.", "Apocalypse Now"],
    ["We're gonna need a bigger boat.", "Jaws"], ["A census taker once tried to test me.", "The Silence of the Lambs"], ["My precious.", "The Lord of the Rings"], ["What we've got here is failure to communicate.", "Cool Hand Luke"],
    ["I'm as mad as hell, and I'm not going to take this anymore!", "Network"], ["They may take our lives, but they'll never take our freedom!", "Braveheart"], ["I'm walking here!", "Midnight Cowboy"], ["I'm Spartacus!", "Spartacus"],
    ["Plastics.", "The Graduate"], ["They call it a Royale with Cheese.", "Pulp Fiction"], ["I am serious. And don't call me Shirley.", "Airplane!"], ["Forget it, Jake. It's Chinatown.", "Chinatown"]
  ];

  const HISTORY_EVENTS = [
    ["the Battle of Tours", "732"], ["the coronation of Charlemagne", "800"], ["the First Crusade capturing Jerusalem", "1099"], ["the fall of Constantinople", "1453"],
    ["the Treaty of Tordesillas", "1494"], ["the defeat of the Spanish Armada", "1588"], ["the founding of Jamestown", "1607"], ["the Mayflower Compact", "1620"],
    ["the beginning of the English Civil War", "1642"], ["the Glorious Revolution", "1688"], ["the Acts of Union joining England and Scotland", "1707"], ["the start of the Seven Years' War", "1756"],
    ["the beginning of the Haitian Revolution", "1791"], ["the Battle of Trafalgar", "1805"], ["the Congress of Vienna", "1814"], ["the start of the Greek War of Independence", "1821"],
    ["the beginning of the First Opium War", "1839"], ["the Seneca Falls Convention", "1848"], ["the start of the Crimean War", "1853"], ["the Meiji Restoration", "1868"],
    ["the opening of the Suez Canal", "1869"], ["the Berlin Conference", "1884"], ["the Boxer Rebellion", "1900"], ["the start of the Russo-Japanese War", "1904"],
    ["the beginning of the Mexican Revolution", "1910"], ["the Russian Revolution", "1917"], ["the creation of the Irish Free State", "1922"], ["the Salt March", "1930"],
    ["the beginning of the Spanish Civil War", "1936"], ["the start of the Nuremberg Trials", "1945"], ["Indian independence from Britain", "1947"], ["the start of the Korean War", "1950"],
    ["the Cuban Revolution", "1959"], ["the Prague Spring", "1968"], ["the Watergate break-in", "1972"], ["German reunification", "1990"]
  ];

  addPairs("Geography", GEOGRAPHY_PLACES,
    function (place) { return `${place} is located in which country?`; },
    function (place, country) { return `Which landmark, region, or natural site is in ${country}?`; },
    function (place, country) { return `${place} is located in ${country}.`; });

  addPairs("Science", SCIENCE_ATOMIC_NUMBERS,
    function (element, atomicNumber) { return `Which element has atomic number ${atomicNumber}?`; },
    function (element) { return `What is the atomic number of ${element}?`; },
    function (element, atomicNumber) { return `${element} has atomic number ${atomicNumber}.`; }, "left");

  addPairs("Music", MUSIC_ALBUMS,
    function (album) { return `Who released the album ${album}?`; },
    function (album, artist) { return `Which album was released by ${artist}?`; },
    function (album, artist) { return `${album} is an album by ${artist}.`; });

  addPairs("Sports", SPORTS_MOMENTS,
    function (athlete, moment) { return `Which athlete is associated with ${moment}?`; },
    function (athlete) { return `Which achievement or distinction is associated with ${athlete}?`; },
    function (athlete, moment) { return `${athlete} is associated with ${moment}.`; }, "left");

  addPairs("Movies & TV", SCREEN_QUOTES,
    function (quote) { return `Which film features the line "${quote}"?`; },
    function (quote, film) { return `Which line comes from ${film}?`; },
    function (quote, film) { return `"${quote}" is a line from ${film}.`; });

  addPairs("History", HISTORY_EVENTS,
    function (event) { return `In what year did ${event} occur?`; },
    function (event, year) { return `Which event occurred in ${year}?`; },
    function (event, year) { return `${event} occurred in ${year}.`; });

  window.PAIDEN_TRIVIA_BANK_VERSION = "20260726c";
})();
