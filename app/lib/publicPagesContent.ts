import type { Language } from '@/contexts/LanguageContext';

export type LocalizedText = Record<Language, string>;

export type AboutValue = {
  title: LocalizedText;
  body: LocalizedText;
};

export type FaqItem = {
  question: LocalizedText;
  answer: LocalizedText;
};

export type LegalPageSection = {
  heading: LocalizedText;
  paragraphs: readonly LocalizedText[];
};

export type LegalPageContent = {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  updatedAt: LocalizedText;
  sections: readonly LegalPageSection[];
};

export type BlogArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  readTime: string;
  intro: string[];
  sections: BlogArticleSection[];
};

export const aboutPageContent = {
  eyebrow: {
    en: 'About TassuKaveri',
    fi: 'Tietoa TassuKaverista',
  },
  title: {
    en: 'Pet care built on trust, credits, and community.',
    fi: 'Lemmikkihoitoa luottamuksen, krediittien ja yhteisön varaan.',
  },
  subtitle: {
    en: 'We are building a kinder way to arrange pet care in Finland, where people help each other instead of relying on expensive last-minute solutions.',
    fi: 'Rakennamme Suomeen inhimillisempää tapaa järjestää lemmikkihoitoa, jossa ihmiset auttavat toisiaan kalliiden viime hetken ratkaisujen sijaan.',
  },
  intro: [
    {
      en: 'At TassuKaveri, we believe pet care should be based on trust, kindness, and community instead of money. That is why we created a credit-based pet care network where members exchange time and help each other when life gets busy.',
      fi: 'TassuKaverissa uskomme, että lemmikkihoidon tulisi perustua luottamukseen, ystävällisyyteen ja yhteisöön, ei rahaan. Siksi loimme krediittipohjaisen lemmikkihoitoverkoston, jossa jäsenet vaihtavat aikaa ja auttavat toisiaan silloin, kun elämä käy kiireiseksi.',
    },
    {
      en: 'Pet owners should not have to choose between high costs and uncertainty. By helping someone else with their pet, you earn credits that you can later use when your own pet needs safe and familiar care.',
      fi: 'Lemmikinomistajan ei pitäisi joutua valitsemaan korkeiden kustannusten ja epävarmuuden välillä. Kun autat toista hänen lemmikkinsä kanssa, ansaitset krediittejä, joita voit käyttää myöhemmin, kun oma lemmikkisi tarvitsee turvallista ja tuttua hoitoa.',
    },
    {
      en: 'Our goal is to make pet care more affordable, more social, and more sustainable for both pets and people.',
      fi: 'Tavoitteemme on tehdä lemmikkihoidosta edullisempaa, yhteisöllisempää ja kestävämpää niin lemmikeille kuin ihmisillekin.',
    },
  ],
  missionTitle: {
    en: 'Our mission',
    fi: 'Missiomme',
  },
  missionBody: {
    en: 'To build a caring community where every pet has someone reliable to look after them, even when schedules change unexpectedly.',
    fi: 'Rakentaa välittävä yhteisö, jossa jokaisella lemmikillä on luotettava hoitaja myös silloin, kun aikataulut muuttuvat yllättäen.',
  },
  valuesTitle: {
    en: 'What guides us',
    fi: 'Mikä ohjaa meitä',
  },
  values: [
    {
      title: {
        en: 'Trust',
        fi: 'Luottamus',
      },
      body: {
        en: 'Verified profiles, reviews, and clear expectations help people feel safe before they agree on care.',
        fi: 'Vahvistetut profiilit, arvostelut ja selkeät odotukset auttavat ihmisiä tuntemaan olonsa turvalliseksi ennen hoidosta sopimista.',
      },
    },
    {
      title: {
        en: 'Kindness',
        fi: 'Ystävällisyys',
      },
      body: {
        en: 'Each exchange is built on helping, not profit. We want the service to feel warm, human, and practical.',
        fi: 'Jokainen vaihto perustuu auttamiseen, ei voitontavoitteluun. Haluamme palvelun tuntuvan lämpimältä, inhimilliseltä ja käytännölliseltä.',
      },
    },
    {
      title: {
        en: 'Community',
        fi: 'Yhteisö',
      },
      body: {
        en: 'Local connections create real relationships, stronger reliability, and better everyday support for pet families.',
        fi: 'Paikalliset yhteydet luovat aitoja suhteita, vahvempaa luotettavuutta ja parempaa arjen tukea lemmikkiperheille.',
      },
    },
  ] satisfies AboutValue[],
  finlandTitle: {
    en: 'Built for Finland',
    fi: 'Rakennettu Suomeen',
  },
  finlandBody: {
    en: 'TassuKaveri is designed for Finnish pet owners, local trust, and neighborhood-level care. We are growing from pilot communities such as Oulu and building something that feels genuinely local instead of generic.',
    fi: 'TassuKaveri on suunniteltu suomalaisille lemmikinomistajille, paikalliselle luottamukselle ja lähialueen hoitoavulle. Kasvamme pilottiyhteisöistä, kuten Oulusta, ja rakennamme jotain aidosti paikallista emmekä geneeristä palvelua.',
  },
  ctaPrimary: {
    en: 'See how it works',
    fi: 'Katso miten se toimii',
  },
  ctaSecondary: {
    en: 'Create an account',
    fi: 'Luo tili',
  },
} as const;

export const faqPageContent = {
  eyebrow: {
    en: 'FAQ',
    fi: 'UKK',
  },
  title: {
    en: 'Answers about credits, trust, and getting started.',
    fi: 'Vastauksia krediiteistä, luottamuksesta ja aloittamisesta.',
  },
  subtitle: {
    en: 'These are the questions people ask most often before joining the community or making their first pet care exchange.',
    fi: 'Nämä ovat yleisimmät kysymykset ennen yhteisöön liittymistä tai ensimmäistä lemmikkihoitovaihtoa.',
  },
  items: [
    {
      question: {
        en: 'What is TassuKaveri?',
        fi: 'Mikä on TassuKaveri?',
      },
      answer: {
        en: 'TassuKaveri is a Finnish community pet care platform where people exchange pet care through credits instead of paying each other directly.',
        fi: 'TassuKaveri on suomalainen yhteisöllinen lemmikkihoitoalusta, jossa ihmiset vaihtavat lemmikkihoitoa krediittien avulla ilman suoria maksuja toisilleen.',
      },
    },
    {
      question: {
        en: 'Is it really free to join?',
        fi: 'Onko liittyminen oikeasti ilmaista?',
      },
      answer: {
        en: 'Yes. Creating an account and using the credit-based exchange flow is free. The core idea is shared help, not money.',
        fi: 'Kyllä. Tilin luominen ja krediittipohjaisen vaihtomallin käyttö on ilmaista. Palvelun ydinajatus on vastavuoroinen apu, ei raha.',
      },
    },
    {
      question: {
        en: 'How do credits work?',
        fi: 'Miten krediitit toimivat?',
      },
      answer: {
        en: 'A simple rule guides the platform: one hour of care equals one credit. When you help someone else, you earn credits that can later be used for your own pet.',
        fi: 'Palvelua ohjaa yksinkertainen sääntö: yksi tunti hoitoa vastaa yhtä krediittiä. Kun autat toista, ansaitset krediittejä, joita voit käyttää myöhemmin oman lemmikkisi hoitoon.',
      },
    },
    {
      question: {
        en: 'How do I join?',
        fi: 'Miten liityn mukaan?',
      },
      answer: {
        en: 'Create an account, complete your profile, add your pet or availability, and then start browsing sitters or requests.',
        fi: 'Luo tili, täydennä profiilisi, lisää lemmikkisi tai saatavuutesi ja aloita sitten hoitajien tai pyyntöjen selaaminen.',
      },
    },
    {
      question: {
        en: 'Where is TassuKaveri available?',
        fi: 'Missä TassuKaveri on käytettävissä?',
      },
      answer: {
        en: 'The service is built for Finland and currently grows from pilot communities such as Oulu before broader expansion.',
        fi: 'Palvelu on rakennettu Suomea varten ja kasvaa tällä hetkellä pilottiyhteisöistä, kuten Oulusta, ennen laajempaa laajentumista.',
      },
    },
    {
      question: {
        en: 'Who can become a sitter?',
        fi: 'Kuka voi toimia hoitajana?',
      },
      answer: {
        en: 'Anyone who loves animals, communicates clearly, and can take responsibility for care can build a sitter profile.',
        fi: 'Kuka tahansa eläimistä pitävä, selkeästi viestivä ja vastuullinen henkilö voi luoda hoitajaprofiilin.',
      },
    },
    {
      question: {
        en: 'Is it safe?',
        fi: 'Onko palvelu turvallinen?',
      },
      answer: {
        en: 'Safety comes from layered trust: profiles, reviews, direct requests, in-app messaging, reporting tools, and community moderation.',
        fi: 'Turvallisuus rakentuu useasta kerroksesta: profiileista, arvosteluista, suorista pyynnöistä, sovelluksen sisäisestä viestinnästä, ilmoitustyökaluista ja yhteisön moderoinnista.',
      },
    },
    {
      question: {
        en: 'How do I contact another sitter?',
        fi: 'Miten otan yhteyttä toiseen hoitajaan?',
      },
      answer: {
        en: 'You can send a direct request from a sitter profile. Once a connection exists, both sides can continue in Messages.',
        fi: 'Voit lähettää suoran pyynnön hoitajan profiilista. Kun yhteys on syntynyt, keskustelua voi jatkaa Viestit-osiossa.',
      },
    },
    {
      question: {
        en: 'What makes TassuKaveri different from a normal marketplace?',
        fi: 'Miten TassuKaveri eroaa tavallisesta markkinapaikasta?',
      },
      answer: {
        en: 'The platform is designed around reciprocity. Instead of comparing prices, members build trust, earn credits, and help each other over time.',
        fi: 'Palvelu on rakennettu vastavuoroisuuden ympärille. Hintojen vertailun sijaan jäsenet rakentavat luottamusta, ansaitsevat krediittejä ja auttavat toisiaan ajan myötä.',
      },
    },
    {
      question: {
        en: 'Is TassuKaveri already live?',
        fi: 'Onko TassuKaveri jo käytössä?',
      },
      answer: {
        en: 'Yes. The platform is available in a growing pilot phase, and features continue to improve as the community expands.',
        fi: 'Kyllä. Alusta on käytössä kasvavassa pilotointivaiheessa, ja ominaisuuksia kehitetään jatkuvasti yhteisön laajentuessa.',
      },
    },
    {
      question: {
        en: 'How can I stay updated?',
        fi: 'Miten pysyn ajan tasalla?',
      },
      answer: {
        en: 'Follow TassuKaveri on social channels, keep an eye on the blog, or contact us directly if you want updates about expansion and community activity.',
        fi: 'Seuraa TassuKaveria somessa, pidä silmällä blogia tai ota yhteyttä suoraan, jos haluat kuulla lisää laajentumisesta ja yhteisön toiminnasta.',
      },
    },
  ] satisfies FaqItem[],
  ctaTitle: {
    en: 'Still wondering if it fits your situation?',
    fi: 'Pohditko vielä, sopiiko tämä juuri sinun tilanteeseesi?',
  },
  ctaBody: {
    en: 'The easiest way to understand the platform is to create a profile and see how requests, credits, and sitter matching work in practice.',
    fi: 'Helpoin tapa ymmärtää palvelua on luoda profiili ja nähdä käytännössä, miten pyynnöt, krediitit ja hoitajien yhdistäminen toimivat.',
  },
  ctaPrimary: {
    en: 'Create an account',
    fi: 'Luo tili',
  },
  ctaSecondary: {
    en: 'Read the blog',
    fi: 'Lue blogia',
  },
} as const;

export const blogIndexContent = {
  eyebrow: {
    en: 'Blog',
    fi: 'Blogi',
  },
  title: {
    en: 'Guides and ideas for calmer pet care in Finland.',
    fi: 'Oppaita ja ajatuksia rauhallisempaan lemmikkiarkeen Suomessa.',
  },
  subtitle: {
    en: 'These articles focus on real questions Finnish pet owners search for: finding reliable care, planning for trips, and understanding community-based alternatives.',
    fi: 'Nämä artikkelit vastaavat kysymyksiin, joita suomalaiset lemmikinomistajat oikeasti etsivät: miten löytää luotettava hoito, suunnitella poissaoloja ja hyödyntää yhteisöllisiä vaihtoehtoja.',
  },
  note: {
    en: 'Choose EN or FI at any time. Every guide is available in both languages.',
    fi: 'Voit vaihtaa kieltä milloin tahansa. Kaikki oppaat ovat saatavilla sekä suomeksi että englanniksi.',
  },
  readMoreLabel: {
    en: 'Read article',
    fi: 'Lue artikkeli',
  },
} as const;

export const blogArticlePageContent = {
  eyebrow: {
    en: 'Blog article',
    fi: 'Blogiartikkeli',
  },
  note: {
    en: 'This article is published in Finnish to match the original indexed URL and local search intent.',
    fi: 'Tämä artikkeli julkaistaan suomeksi, jotta se vastaa alkuperäistä indeksoitua URL-osoitetta ja paikallista hakuintenttiä.',
  },
  backLabel: {
    en: 'Back to blog',
    fi: 'Takaisin blogiin',
  },
  ctaTitle: {
    en: 'Need help with your own pet care plan?',
    fi: 'Tarvitsetko apua oman lemmikkihoidon suunnitteluun?',
  },
  ctaBody: {
    en: 'Create a profile and start building a local circle of trusted pet helpers.',
    fi: 'Luo profiili ja ala rakentaa paikallista, luotettavaa lemmikkiavun verkostoa.',
  },
  ctaPrimary: {
    en: 'Create an account',
    fi: 'Luo tili',
  },
} as const;

export const privacyPolicyPageContent = {
  eyebrow: {
    en: 'Privacy Policy',
    fi: 'Tietosuojaseloste',
  },
  title: {
    en: 'How TassuKaveri handles personal data.',
    fi: 'Miten TassuKaveri käsittelee henkilötietoja.',
  },
  subtitle: {
    en: 'This page explains what we collect, why we use it, who helps us process it, and how you can use your privacy rights.',
    fi: 'Tällä sivulla kerrotaan, mitä tietoja keräämme, miksi käytämme niitä, ketkä auttavat meitä käsittelemään tietoja ja miten voit käyttää tietosuojaoikeuksiasi.',
  },
  updatedAt: {
    en: 'July 5, 2026',
    fi: '5.7.2026',
  },
  sections: [
    {
      heading: {
        en: 'Controller and contact',
        fi: 'Rekisterinpitäjä ja yhteystiedot',
      },
      paragraphs: [
        {
          en: 'TassuKaveri is responsible for the personal data processed through the website and service.',
          fi: 'TassuKaveri vastaa verkkosivuston ja palvelun kautta käsiteltävistä henkilötiedoista.',
        },
        {
          en: 'For privacy questions, account requests, or data subject rights, contact us at info@tassukaveri.fi.',
          fi: 'Tietosuojakysymyksissä, tilipyyntöjen yhteydessä tai rekisteröidyn oikeuksien käyttämiseksi voit ottaa yhteyttä osoitteeseen info@tassukaveri.fi.',
        },
      ],
    },
    {
      heading: {
        en: 'Detailed information we collect',
        fi: 'Tarkemmat keräämämme tiedot',
      },
      paragraphs: [
        {
          en: 'We may process account details, email verification status, profile details, location, pet details, availability, photos, care requests, direct asks, accepted care records, messages, credit reservations and releases, reviews, trust score, cancellation history, support messages, moderation reports, and security logs.',
          fi: 'Voimme käsitellä tilitietoja, sähköpostin vahvistustilaa, profiilitietoja, sijaintia, lemmikkitietoja, saatavuutta, kuvia, hoitopyyntöjä, suoria pyyntöjä, hyväksyttyjä hoitotapahtumia, viestejä, krediittien varauksia ja vapautuksia, arvosteluja, luottamustasoa, peruutushistoriaa, tukiviestejä, moderointi-ilmoituksia ja turvallisuuslokeja.',
        },
        {
          en: 'If you submit your email through the website popup, we save the email address, submission date, and source as website_popup so we can send TassuKaveri details and updates.',
          fi: 'Jos lähetät sähköpostiosoitteesi verkkosivuston ponnahdusikkunassa, tallennamme sähköpostiosoitteen, lähetyspäivän ja lähteen website_popup, jotta voimme lähettää TassuKaveri-tietoja ja päivityksiä.',
        },
      ],
    },
    {
      heading: {
        en: 'Legal bases and purposes',
        fi: 'Oikeusperusteet ja tarkoitukset',
      },
      paragraphs: [
        {
          en: 'We use information to create accounts, verify email addresses, show relevant profiles and requests, support messaging, reserve and release credits, display reviews, respond to support requests, prevent abuse, and keep the service secure.',
          fi: 'Käytämme tietoja tilien luomiseen, sähköpostiosoitteiden vahvistamiseen, olennaisten profiilien ja pyyntöjen näyttämiseen, viestien tukemiseen, krediittien varaamiseen ja vapauttamiseen, arvostelujen näyttämiseen, tukipyyntöihin vastaamiseen, väärinkäytösten estämiseen ja palvelun suojaamiseen.',
        },
        {
          en: 'The legal bases may include contract performance for account and care features, consent for email updates and optional analytics, legitimate interests for safety and abuse prevention, and legal obligations where applicable.',
          fi: 'Oikeusperusteita voivat olla sopimuksen täyttäminen tili- ja hoito-ominaisuuksissa, suostumus sähköpostipäivityksiin ja valinnaiseen analytiikkaan, oikeutettu etu turvallisuuden ja väärinkäytösten estämisessä sekä sovellettavat lakisääteiset velvoitteet.',
        },
      ],
    },
    {
      heading: {
        en: 'Cookies, local storage, and analytics',
        fi: 'Evästeet, paikallinen tallennus ja analytiikka',
      },
      paragraphs: [
        {
          en: 'We use necessary browser storage for login sessions, language choice, onboarding choices, and to remember whether the email popup was closed or submitted. These are needed for the website experience to work properly.',
          fi: 'Käytämme välttämätöntä selaintallennusta kirjautumiseen, kielivalintaan, aloitusvalintoihin ja siihen, muistetaanko sähköpostiponnahdusikkunan sulkeminen tai lähetys. Näitä tarvitaan sivuston toimivuuteen.',
        },
        {
          en: 'Optional analytics, such as Google Analytics or Google Tag Manager, only loads after you accept analytics cookies. You can change this choice on the Cookie Preferences page.',
          fi: 'Valinnainen analytiikka, kuten Google Analytics tai Google Tag Manager, latautuu vain, jos hyväksyt analytiikkaevästeet. Voit muuttaa valintaa Evasteasetukset-sivulla.',
        },
      ],
    },
    {
      heading: {
        en: 'Service providers and transfers',
        fi: 'Palveluntarjoajat ja siirrot',
      },
      paragraphs: [
        {
          en: 'We use service providers to host, store, secure, and send parts of the service, such as Supabase for authentication and database services, Vercel or similar hosting, email delivery providers, and Google analytics tools if you consent.',
          fi: 'Käytämme palveluntarjoajia palvelun hostaamiseen, tallentamiseen, suojaamiseen ja viestien lähettämiseen. Näitä voivat olla esimerkiksi Supabase tunnistautumiseen ja tietokantaan, Vercel tai vastaava hosting, sähköpostin lähetyspalvelut ja Googlen analytiikkatyökalut, jos annat suostumuksen.',
        },
        {
          en: 'Some providers may process data outside Finland or the EEA. When that happens, appropriate safeguards such as EU Standard Contractual Clauses or equivalent transfer mechanisms should be used.',
          fi: 'Osa palveluntarjoajista voi käsitellä tietoja Suomen tai ETA-alueen ulkopuolella. Tällöin tulee käyttää asianmukaisia suojatoimia, kuten EU:n vakiosopimuslausekkeita tai vastaavia siirtomekanismeja.',
        },
      ],
    },
    {
      heading: {
        en: 'Retention and your rights',
        fi: 'Säilytys ja oikeutesi',
      },
      paragraphs: [
        {
          en: 'We keep account and service information for as long as it is needed to operate the account, provide the pet-care exchange, protect trust and safety, resolve disputes, and meet legal obligations. Email update subscriptions are kept until you ask us to remove them or until they are no longer needed.',
          fi: 'Säilytämme tili- ja palvelutietoja niin kauan kuin niitä tarvitaan tilin ylläpitoon, lemmikkihoidon vaihtopalvelun tarjoamiseen, luottamuksen ja turvallisuuden suojaamiseen, riitojen ratkaisemiseen ja lakisääteisten velvoitteiden täyttämiseen. Sähköpostipäivitysten tilaukset säilytetään, kunnes pyydät poistamista tai kunnes niitä ei enää tarvita.',
        },
        {
          en: 'Depending on the legal basis and situation, you may have the right to access your data, correct it, request deletion, restrict processing, object to processing, receive portable data, and withdraw consent. You can also contact the Finnish Data Protection Ombudsman if you believe your rights have not been respected.',
          fi: 'Oikeusperusteesta ja tilanteesta riippuen sinulla voi olla oikeus saada pääsy tietoihisi, korjata tietoja, pyytää poistamista, rajoittaa käsittelyä, vastustaa käsittelyä, saada tiedot siirrettävässä muodossa ja peruuttaa suostumus. Voit myös ottaa yhteyttä Suomen tietosuojavaltuutettuun, jos katsot, ettei oikeuksiasi ole noudatettu.',
        },
      ],
    },
    {
      heading: {
        en: 'Information you provide',
        fi: 'Antamasi tiedot',
      },
      paragraphs: [
        {
          en: 'This can include account and profile details such as your name, email address, email verification status, location, pet information, profile description, availability, and photos.',
          fi: 'Tähän voi kuulua tili- ja profiilitietoja, kuten nimesi, sähköpostiosoitteesi, sähköpostin vahvistustila, sijainti, lemmikkitiedot, profiilikuvaus, saatavuus ja kuvat.',
        },
        {
          en: 'It can also include information you create inside the service, such as requests, sitter offers, messages, reviews, credit activity, and moderation reports.',
          fi: 'Tähän voivat kuulua myös palvelussa syntyvät tiedot, kuten pyynnöt, hoitajatarjoukset, viestit, arvostelut, krediittitapahtumat ja moderointiin liittyvät ilmoitukset.',
        },
      ],
    },
    {
      heading: {
        en: 'How information is used',
        fi: 'Mihin tietoja käytetään',
      },
      paragraphs: [
        {
          en: 'We use information to operate the service, show relevant profiles and requests, support messaging, and help members arrange pet care more safely.',
          fi: 'Tietoja käytetään palvelun ylläpitämiseen, olennaisten profiilien ja pyyntöjen näyttämiseen, viestinnän tukemiseen ja turvallisempien lemmikkihoitojärjestelyjen helpottamiseen.',
        },
        {
          en: 'Information may also be used to improve trust and safety, respond to support questions, prevent abuse, and understand how the service is being used.',
          fi: 'Tietoja voidaan käyttää myös luottamuksen ja turvallisuuden parantamiseen, tukikysymyksiin vastaamiseen, väärinkäytösten ehkäisyyn ja palvelun käytön ymmärtämiseen.',
        },
      ],
    },
    {
      heading: {
        en: 'What other members can see',
        fi: 'Mitä muut jäsenet voivat nähdä',
      },
      paragraphs: [
        {
          en: 'Information that you choose to publish in your profile or care requests can be visible to other members of the platform.',
          fi: 'Tiedot, jotka päätät julkaista profiilissasi tai hoitopyynnöissäsi, voivat näkyä muille palvelun jäsenille.',
        },
        {
          en: 'Private account details and moderation-related information are not meant for public display.',
          fi: 'Yksityiset tilitiedot ja moderointiin liittyvät tiedot eivät ole tarkoitettu julkisesti näkyviksi.',
        },
      ],
    },
    {
      heading: {
        en: 'Retention and contact',
        fi: 'Säilytys ja yhteydenotto',
      },
      paragraphs: [
        {
          en: 'We keep information for as long as it is needed to operate the service, support trust and safety, and meet legal obligations.',
          fi: 'Tietoja säilytetään niin kauan kuin niitä tarvitaan palvelun ylläpitämiseen, luottamuksen ja turvallisuuden tukemiseen sekä lakisääteisten velvoitteiden täyttämiseen.',
        },
        {
          en: 'If you have questions about privacy or need help regarding your account, contact us at info@tassukaveri.fi.',
          fi: 'Jos sinulla on kysyttävää tietosuojasta tai tarvitset apua tiliisi liittyen, ota yhteyttä osoitteeseen info@tassukaveri.fi.',
        },
      ],
    },
  ] satisfies LegalPageSection[],
} as const satisfies LegalPageContent;

export const termsOfServicePageContent = {
  eyebrow: {
    en: 'Terms of Service',
    fi: 'Käyttöehdot',
  },
  title: {
    en: 'The basic rules for using TassuKaveri.',
    fi: 'TassuKaverin käytön perussäännöt.',
  },
  subtitle: {
    en: 'These terms describe what members can expect from the platform and what we expect from members who use the service.',
    fi: 'Nämä ehdot kuvaavat, mitä jäsenet voivat odottaa alustalta ja mitä odotamme palvelua käyttäviltä jäseniltä.',
  },
  updatedAt: {
    en: 'April 9, 2026',
    fi: '9.4.2026',
  },
  sections: [
    {
      heading: {
        en: 'TassuKaveri role',
        fi: 'TassuKaverin rooli',
      },
      paragraphs: [
        {
          en: 'TassuKaveri provides an online platform that helps pet owners and pet carers find, communicate with, and make arrangements with each other.',
          fi: 'TassuKaveri tarjoaa verkkoalustan, joka auttaa lemmikinomistajia ja lemmikinhoitajia löytämään toisensa, viestimään ja sopimaan järjestelyistä keskenään.',
        },
        {
          en: 'TassuKaveri does not provide pet-care services and is not the employer, representative, or agent of any user. Any pet-care arrangement is made directly between the pet owner and the pet carer.',
          fi: 'TassuKaveri ei tarjoa lemmikinhoitopalveluja eikä ole käyttäjän työnantaja, edustaja tai asiamies. Jokainen lemmikinhoitojärjestely tehdään suoraan lemmikinomistajan ja lemmikinhoitajan välillä.',
        },
        {
          en: 'Users are responsible for deciding whether another user is suitable and for agreeing on the dates, duration, credits, pet-care instructions, access arrangements, emergency procedures, insurance, and all other conditions of the arrangement.',
          fi: 'Käyttäjät vastaavat itse siitä, onko toinen käyttäjä sopiva, sekä päivämääristä, kestosta, krediiteistä, hoito-ohjeista, pääsyjärjestelyistä, hätätilanteista, vakuutuksista ja muista järjestelyn ehdoista sopimisesta.',
        },
        {
          en: 'Pet owners are responsible for providing complete and accurate information about their pets, including behaviour, health conditions, medication, feeding requirements, and possible safety risks. Pet carers are responsible for deciding whether they have the necessary ability, experience, availability, and suitable conditions to care for the pet safely.',
          fi: 'Lemmikinomistajat vastaavat täydellisten ja oikeiden tietojen antamisesta lemmikeistään, mukaan lukien käytös, terveydentila, lääkitys, ruokinta ja mahdolliset turvallisuusriskit. Lemmikinhoitajat vastaavat itse siitä, onko heillä tarvittava kyky, kokemus, saatavuus ja sopivat olosuhteet hoitaa lemmikkiä turvallisesti.',
        },
        {
          en: 'TassuKaveri verifies users email addresses only. Email verification confirms only that the user has access to the provided email address. It does not confirm the users identity, background, qualifications, experience, reliability, behaviour, or suitability to provide pet care.',
          fi: 'TassuKaveri vahvistaa vain käyttäjien sähköpostiosoitteet. Sähköpostivahvistus vahvistaa vain, että käyttäjällä on pääsy annettuun sähköpostiosoitteeseen. Se ei vahvista käyttäjän henkilöllisyyttä, taustaa, pätevyyttä, kokemusta, luotettavuutta, käytöstä tai sopivuutta lemmikinhoitoon.',
        },
        {
          en: 'To the extent permitted by applicable law, TassuKaveri is not responsible for disputes, injuries, illnesses, loss, theft, property damage, pet loss, pet injury, or other harm resulting from arrangements or interactions between users. Nothing in these Terms excludes or limits any responsibility that cannot legally be excluded, including responsibility arising from TassuKaveris own unlawful actions or failure to meet its legal obligations.',
          fi: 'Sovellettavan lain sallimissa rajoissa TassuKaveri ei vastaa käyttäjien välisten järjestelyjen tai vuorovaikutuksen seurauksena syntyvistä riidoista, vammoista, sairauksista, menetyksistä, varkauksista, omaisuusvahingoista, lemmikin katoamisesta, lemmikin loukkaantumisesta tai muusta vahingosta. Mikään näissä ehdoissa ei poista tai rajoita vastuuta, jota ei voida lain mukaan poistaa, mukaan lukien vastuu TassuKaverin omista lainvastaisista toimista tai lakisääteisten velvoitteiden laiminlyönnistä.',
        },
      ],
    },
    {
      heading: {
        en: 'Community platform',
        fi: 'Yhteisöalusta',
      },
      paragraphs: [
        {
          en: 'TassuKaveri connects pet owners and sitters through a credit-based community model.',
          fi: 'TassuKaveri yhdistää lemmikinomistajia ja hoitajia krediittipohjaisen yhteisömallin avulla.',
        },
        {
          en: 'The platform helps members find each other, but each care arrangement is still made between the people involved.',
          fi: 'Alusta auttaa jäseniä löytämään toisensa, mutta jokainen hoitojärjestely sovitaan edelleen osapuolten välillä.',
        },
      ],
    },
    {
      heading: {
        en: 'Accounts and profiles',
        fi: 'Tilit ja profiilit',
      },
      paragraphs: [
        {
          en: 'You should provide accurate information and keep your profile reasonably up to date.',
          fi: 'Sinun tulee antaa oikeat tiedot ja pitää profiilisi kohtuullisen ajantasaisena.',
        },
        {
          en: 'You are responsible for activity that happens through your account and for protecting your login details.',
          fi: 'Vastaat tilisi kautta tapahtuvasta toiminnasta ja kirjautumistietojesi suojaamisesta.',
        },
      ],
    },
    {
      heading: {
        en: 'Credits and exchanges',
        fi: 'Krediitit ja vaihdot',
      },
      paragraphs: [
        {
          en: 'Credits are used inside TassuKaveri to reflect community help and are not cash or a cash substitute.',
          fi: 'Krediittejä käytetään TassuKaverissa yhteisöllisen avun mittarina, eivätkä ne ole rahaa tai rahan korvike.',
        },
        {
          en: 'Members should communicate clearly about availability, expectations, and pet care details before agreeing to an exchange.',
          fi: 'Jäsenten tulee viestiä selkeästi saatavuudesta, odotuksista ja lemmikkihoidon yksityiskohdista ennen vaihdosta sopimista.',
        },
      ],
    },
    {
      heading: {
        en: 'Cancellations and disputes',
        fi: 'Peruutukset ja riidat',
      },
      paragraphs: [
        {
          en: 'Open requests can be cancelled by the pet owner before a sitter accepts. After care is accepted, either user can cancel in the service. If the owner cancels more than 24 hours before the start time, reserved credits are returned to the owner. If the owner cancels within 24 hours of the start time, reserved credits may be released to the sitter. If the sitter cancels, reserved credits are returned to the owner.',
          fi: 'Lemmikinomistaja voi peruuttaa avoimen pyynnön ennen hoitajan hyväksyntää. Kun hoito on hyväksytty, kumpi tahansa käyttäjä voi peruuttaa sen palvelussa. Jos omistaja peruuttaa yli 24 tuntia ennen aloitusta, varatut krediitit palautetaan omistajalle. Jos omistaja peruuttaa alle 24 tuntia ennen aloitusta, varatut krediitit voidaan vapauttaa hoitajalle. Jos hoitaja peruuttaa, varatut krediitit palautetaan omistajalle.',
        },
        {
          en: 'If a user does not attend, provides unsafe care, gives false profile information, or a dispute occurs, the other user should report the issue through the service. TassuKaveri may review reports and take platform action such as warnings, restrictions, suspension, or removal, but does not guarantee that it will resolve private disputes between users.',
          fi: 'Jos käyttäjä ei saavu paikalle, toimii turvattomasti, antaa vääriä profiilitietoja tai syntyy riita, toisen käyttäjän tulee ilmoittaa asiasta palvelussa. TassuKaveri voi tarkistaa ilmoituksia ja tehdä alustaan liittyviä toimia, kuten antaa varoituksia, rajoittaa käyttöä, jäädyttää tai poistaa tilin, mutta se ei takaa käyttäjien yksityisten riitojen ratkaisemista.',
        },
        {
          en: 'Users remain responsible for agreements made directly with each other, including practical care details, home access, emergency contacts, insurance, and any follow-up needed after the arrangement.',
          fi: 'Käyttäjät vastaavat edelleen keskenään tekemistään sopimuksista, mukaan lukien käytännön hoitotiedot, pääsy kotiin, hätäyhteystiedot, vakuutukset ja järjestelyn jälkeiset jatkotoimet.',
        },
      ],
    },
    {
      heading: {
        en: 'Safety and conduct',
        fi: 'Turvallisuus ja toiminta',
      },
      paragraphs: [
        {
          en: 'Members must treat each other respectfully, follow local law, and put animal welfare first.',
          fi: 'Jäsenten tulee kohdella toisiaan kunnioittavasti, noudattaa paikallista lainsäädäntöä ja asettaa eläinten hyvinvointi etusijalle.',
        },
        {
          en: 'Harassment, fraud, fake profiles, or unsafe behavior can lead to content removal, restrictions, or account suspension.',
          fi: 'Häirintä, petokset, valetilit tai turvaton toiminta voivat johtaa sisällön poistamiseen, rajoituksiin tai tilin sulkemiseen.',
        },
      ],
    },
    {
      heading: {
        en: 'Changes and contact',
        fi: 'Muutokset ja yhteydenotto',
      },
      paragraphs: [
        {
          en: 'The service may evolve as features and community guidelines improve over time.',
          fi: 'Palvelu voi kehittyä ajan myötä ominaisuuksien ja yhteisön pelisääntöjen parantuessa.',
        },
        {
          en: 'Questions about these terms can be sent to info@tassukaveri.fi.',
          fi: 'Näitä ehtoja koskevat kysymykset voi lähettää osoitteeseen info@tassukaveri.fi.',
        },
      ],
    },
  ] satisfies LegalPageSection[],
} as const satisfies LegalPageContent;

export const blogArticles: BlogArticle[] = [
  {
    slug: 'lemmikinhoito-oulussa.html',
    title: 'Lemmikinhoito Oulussa – parhaat vaihtoehdot lemmikinomistajille',
    description:
      'Etsitkö lemmikinhoitoa Oulussa? Lue parhaat vaihtoehdot koiran ja kissan hoitoon Oulussa sekä yhteisölliset ratkaisut.',
    excerpt:
      'Etsitkö lemmikinhoitoa Oulussa? Tässä artikkelissa käymme läpi yleisimmät vaihtoehdot koiran ja kissan hoitoon sekä paikalliset, yhteisölliset ratkaisut.',
    publishedAt: '23.12.2025',
    author: 'TassuKaveri-tiimi',
    readTime: '5 min',
    intro: [
      'Oulussa asuville lemmikinomistajille lemmikinhoidon järjestäminen voi olla haastavaa, erityisesti lomien ja kiireisten arkipäivien aikana. Monet kysyvät: mistä löytää luotettava lemmikinhoito Oulussa ilman stressiä tai suuria kustannuksia?',
      'Tässä artikkelissa käymme läpi yleisimmät vaihtoehdot lemmikinhoitoon Oulussa sekä annamme vinkkejä siihen, miten löydät hoidon, joka sopii sekä sinulle että lemmikillesi.',
    ],
    sections: [
      {
        heading: 'Miksi lemmikinhoidon tarve Oulussa kasvaa?',
        paragraphs: [
          'Oulu on kasvava kaupunki, jossa moni asuu kaukana perheestään tai sukulaisistaan. Työmatkat, opiskelijavaihto ja lomat lisäävät tarvetta luotettavalle lemmikinhoidolle.',
          'Kaikilla ei ole mahdollisuutta viedä lemmikkiä mukaan matkalle, jolloin hoidon järjestäminen on välttämätöntä.',
        ],
      },
      {
        heading: 'Yleisimmät vaihtoehdot lemmikinhoitoon Oulussa',
        paragraphs: ['Kun etsit lemmikinhoitoa Oulussa, voit harkita seuraavia vaihtoehtoja:'],
        bullets: [
          'Perhe ja ystävät – tuttu ja luotettava ratkaisu, mutta ei aina saatavilla.',
          'Ammattimaiset lemmikinhoitajat – osaavaa hoitoa, mutta usein kallista.',
          'Lemmikkihotellit – valvottu ympäristö, joka ei kuitenkaan sovi kaikille lemmikeille.',
          'Kotihoito – hoitaja käy lemmikin luona omassa kodissa.',
        ],
      },
      {
        heading: 'Koiran hoito Oulussa',
        paragraphs: [
          'Koiran hoito Oulussa vaatii usein säännöllistä ulkoilua ja aktiivista hoitoa. Koirat hyötyvät eniten tutusta ympäristöstä ja rutiineista.',
          'Kotihoito tai paikallinen hoitaja on usein koiralle stressittömämpi vaihtoehto kuin hoitola.',
        ],
      },
      {
        heading: 'Kissan hoito Oulussa',
        paragraphs: [
          'Kissan hoito Oulussa onnistuu usein parhaiten kotona. Kissat ovat herkkiä ympäristön muutoksille, ja tuttu koti auttaa vähentämään stressiä.',
          'Säännölliset hoitokäynnit riittävät usein lyhyillä poissaoloilla.',
        ],
      },
      {
        heading: 'Mitä kannattaa huomioida hoitajaa valitessa?',
        paragraphs: ['Riippumatta siitä, minkä vaihtoehdon valitset, varmista että hoitaja:'],
        bullets: [
          'On luotettava ja tavoitettavissa.',
          'Tuntee lemmikkisi tarpeet.',
          'Saa selkeät ohjeet ruokinnasta ja rutiineista.',
          'Tietää toimintaohjeet hätätilanteissa.',
        ],
      },
      {
        heading: 'Yhteisöllinen lemmikinhoito Oulussa',
        paragraphs: [
          'Yhteisöllinen lemmikinhoito on yleistymässä myös Oulussa. Paikalliset lemmikinomistajat auttavat toisiaan vastavuoroisesti, mikä tekee hoidosta joustavaa ja edullista.',
          'Tällaisessa mallissa lemmikki saa hoitoa tutussa ympäristössä ja omistaja saa mielenrauhan.',
        ],
      },
      {
        heading: 'Paikallinen ja luotettava ratkaisu',
        paragraphs: [
          'Yhteisöpohjaiset ratkaisut, kuten TassuKaveri, on suunniteltu erityisesti paikalliseen käyttöön. Ne yhdistävät Oulun alueen lemmikinomistajia ja mahdollistavat hoidon järjestämisen ilman rahaa krediittipohjaisesti.',
        ],
      },
      {
        heading: 'Yhteenveto',
        paragraphs: [
          'Lemmikinhoito Oulussa on mahdollista monella eri tavalla. Oikean ratkaisun löytäminen riippuu lemmikin tarpeista, omistajan aikataulusta ja käytettävissä olevista vaihtoehdoista. Yhteisölliset ja paikalliset ratkaisut tarjoavat yhä useammalle joustavan ja luotettavan vaihtoehdon.',
        ],
      },
    ],
  },
  {
    slug: 'ilmainen-lemmikinhoito.html',
    title: 'Ilmainen lemmikinhoito – onko se mahdollista?',
    description:
      'Onko ilmainen lemmikinhoito mahdollista? Lue realistiset vaihtoehdot ja yhteisölliset ratkaisut lemmikin hoitoon ilman suuria kustannuksia.',
    excerpt:
      'Miten lemmikinhoitoa voi järjestää ilman suuria kustannuksia? Tarkastelemme ilmaisia ja edullisia vaihtoehtoja sekä sitä, milloin ne toimivat parhaiten.',
    publishedAt: '23.12.2025',
    author: 'TassuKaveri-tiimi',
    readTime: '5 min',
    intro: [
      'Lemmikinhoito voi olla kallista, erityisesti lomien ja pidempien poissaolojen aikana. Siksi moni lemmikinomistaja kysyy: onko ilmainen lemmikinhoito mahdollista, vai onko kyse vain harvinaisista poikkeuksista?',
      'Tässä artikkelissa tarkastelemme realistisesti ilmaisia ja edullisia vaihtoehtoja lemmikin hoitoon sekä sitä, milloin ne toimivat parhaiten.',
    ],
    sections: [
      {
        heading: 'Miksi lemmikinhoito maksaa yleensä paljon?',
        paragraphs: [
          'Ammattimainen lemmikinhoito sisältää vastuuta, aikaa ja usein vakuutuksia. Tämän vuoksi hinnat voivat nousta korkeiksi, etenkin jos hoitoa tarvitaan useaksi päiväksi tai viikoksi.',
          'Monille lemmikinomistajille kustannukset muodostuvat esteeksi, vaikka tarve hoitoon olisi todellinen.',
        ],
      },
      {
        heading: 'Milloin ilmainen lemmikinhoito on mahdollista?',
        paragraphs: [
          'Ilmainen lemmikinhoito on mahdollista tietyissä tilanteissa, erityisesti silloin, kun hoito perustuu vastavuoroisuuteen tai yhteisöllisyyteen.',
        ],
        bullets: [
          'Perheenjäsenet tai ystävät auttavat.',
          'Naapurit hoitavat lemmikkiä lyhytaikaisesti.',
          'Lemmikinomistajat auttavat toisiaan vuorotellen.',
        ],
      },
      {
        heading: 'Ilmainen lemmikinhoito vs. maksullinen hoito',
        paragraphs: [
          'Ilmaisessa lemmikinhoidossa etuna on kustannusten puuttuminen, mutta se vaatii usein joustavuutta ja hyvää ennakkosuunnittelua.',
          'Maksullinen hoito tuo usein ammattitaitoa ja varmuutta, mutta ei välttämättä ole kaikille taloudellisesti mahdollista.',
        ],
      },
      {
        heading: 'Lemmikinhoito ilman rahaa – miten se toimii käytännössä?',
        paragraphs: [
          'Lemmikinhoito ilman rahaa toimii parhaiten silloin, kun hoito perustuu vaihtoperiaatteeseen. Esimerkiksi tänään hoidat toisen lemmikkiä, ja myöhemmin saat apua omaan tarpeeseesi.',
          'Tällainen malli vaatii selkeät pelisäännöt, luottamusta ja avoimuutta molemmilta osapuolilta.',
        ],
      },
      {
        heading: 'Yhteisöllinen lemmikinhoito Suomessa',
        paragraphs: [
          'Suomessa yhteisöllinen lemmikinhoito on kasvava ilmiö. Yhä useampi lemmikinomistaja etsii vaihtoehtoja perinteisille hoitoloille.',
          'Paikalliset yhteisöt ja alustat mahdollistavat hoidon järjestämisen lähellä omaa kotia, mikä vähentää lemmikin stressiä.',
        ],
      },
      {
        heading: 'Kenelle ilmainen lemmikinhoito sopii?',
        paragraphs: ['Ilmainen tai vastavuoroinen lemmikinhoito sopii erityisesti:'],
        bullets: [
          'Lemmikinomistajille, jotka ovat joustavia aikataulujen suhteen.',
          'Niille, jotka haluavat auttaa muita.',
          'Paikallisesti asuville, joille yhteisö on tärkeä.',
        ],
      },
      {
        heading: 'Yhteisöpohjainen ratkaisu lemmikinhoitoon',
        paragraphs: [
          'Yhteisöpohjaiset ratkaisut, kuten TassuKaveri, tarjoavat mallin, jossa lemmikinomistajat auttavat toisiaan krediittipohjaisesti ilman rahaa. Hoito perustuu vastavuoroisuuteen ja paikalliseen luottamukseen.',
          'Tämä yhdistää ilmaisen lemmikinhoidon edut ja järjestelmällisen toimintamallin.',
        ],
      },
      {
        heading: 'Yhteenveto',
        paragraphs: [
          'Ilmainen lemmikinhoito on mahdollista, mutta se vaatii oikeanlaisen toimintamallin ja yhteisön. Vastavuoroisuus, luottamus ja ennakkosuunnittelu ovat avainasemassa, jotta lemmikki saa turvallista hoitoa ilman suuria kustannuksia.',
        ],
      },
    ],
  },
  {
    slug: 'ei-loydy-lemmikinhoitajaa.html',
    title: 'Mitä tehdä, kun ei löydy lemmikinhoitajaa? Käytännön ratkaisut',
    description:
      'Lemmikinhoitajaa ei löydy? Lue käytännön ratkaisut ja vinkit koiran ja kissan hoitoon kiireellisissä tilanteissa.',
    excerpt:
      'Kun hoitaja puuttuu viime hetkellä, vaihtoehtoja on silti olemassa. Tässä oppaassa käymme läpi yleisimmät virheet, nopeat ratkaisut ja tavat välttää sama tilanne jatkossa.',
    publishedAt: '23.12.2025',
    author: 'TassuKaveri-tiimi',
    readTime: '5 min',
    intro: [
      'Tilanne on monelle lemmikinomistajalle tuttu: matka lähestyy, työ tai perhetilanne muuttuu äkillisesti, ja huomaat että lemmikinhoitajaa ei löydy. Tämä aiheuttaa stressiä, sillä lemmikin hyvinvointi on aina etusijalla.',
      'Tässä artikkelissa käymme läpi käytännön ratkaisut siihen, mitä tehdä, kun ei löydy lemmikinhoitajaa, sekä vinkit koiran ja kissan hoitoon kiireellisissä tilanteissa.',
    ],
    sections: [
      {
        heading: 'Miksi lemmikinhoitajaa on joskus vaikea löytää?',
        paragraphs: [
          'Lemmikinhoitajan löytäminen voi olla haastavaa erityisesti lomasesonkien aikana, kuten kesällä ja jouluna. Moni etsii hoitajaa samaan aikaan, jolloin ammattilaiset ja hoitolat täyttyvät nopeasti.',
          'Lisäksi kaikki hoitajat eivät sovi kaikille lemmikeille. Erityistarpeet, aikataulut ja luottamuskysymykset rajaavat vaihtoehtoja entisestään.',
        ],
      },
      {
        heading: 'Yleisimmät virheet lemmikinhoitajan etsimisessä',
        paragraphs: ['Usein hoitajan puuttuminen ei johdu huonosta tuurista, vaan näistä yleisistä virheistä:'],
        bullets: [
          'Etsintä aloitetaan liian myöhään.',
          'Hoitajalle ei anneta selkeitä ohjeita.',
          'Odotukset ovat liian tiukat.',
          'Luotetaan vain yhteen vaihtoehtoon ilman varasuunnitelmaa.',
        ],
      },
      {
        heading: 'Nopeat ratkaisut, kun aikaa on vähän',
        paragraphs: [
          'Jos huomaat viime hetkellä, että lemmikinhoitaja ei löytynyt, toimi rauhallisesti mutta nopeasti. Aloita kartoittamalla lähipiiri: naapurit, tuttavat ja työtoverit.',
          'Paikalliset sosiaalisen median ryhmät ja yhteisöt voivat myös tarjota nopean ratkaisun, erityisesti lyhytaikaiseen hoitoon.',
        ],
      },
      {
        heading: 'Lemmikin hoito hätätilanteessa',
        paragraphs: [
          'Äkillisissä tilanteissa lemmikin hoito kannattaa järjestää mahdollisimman tutussa ympäristössä. Kotona tapahtuva hoito vähentää lemmikin stressiä ja helpottaa hoitajaa.',
          'Jätä aina kirjalliset ohjeet ruokinnasta, lääkityksestä ja yhteystiedot eläinlääkäriin hätätilanteita varten.',
        ],
      },
      {
        heading: 'Koiran hoito, kun hoitaja puuttuu',
        paragraphs: [
          'Koirat tarvitsevat säännöllistä liikuntaa ja ihmiskontaktia. Jos hoitaja löytyy lyhyellä varoitusajalla, varmista että hän tuntee koiran päivittäiset rutiinit ja käyttäytymisen.',
          'Ulkoiluajat, ruokinta ja mahdolliset erityistarpeet on hyvä käydä läpi etukäteen.',
        ],
      },
      {
        heading: 'Kissan hoito kiireellisessä tilanteessa',
        paragraphs: [
          'Kissat sopeutuvat usein parhaiten kotihoitoon. Lyhyillä poissaoloilla riittää usein, että hoitaja käy päivittäin huolehtimassa ruoasta, vedestä ja hiekkalaatikosta.',
          'Kissan kanssa on tärkeää säilyttää tutut rutiinit ja ympäristö.',
        ],
      },
      {
        heading: 'Miten välttää sama tilanne jatkossa?',
        paragraphs: [
          'Paras tapa välttää stressi tulevaisuudessa on varautuminen. Aloita hoitajan etsiminen ajoissa ja pidä mielessä useampi vaihtoehto.',
          'Paikalliset ja yhteisölliset ratkaisut voivat tarjota pitkäaikaisen ja luotettavan verkoston lemmikin hoitoon.',
        ],
      },
      {
        heading: 'Yhteisöllinen ratkaisu lemmikinhoitoon',
        paragraphs: [
          'Monille lemmikinomistajille haaste ei ole maksaminen, vaan luotettavan hoitajan löytäminen. Yhteisöpohjaiset ratkaisut, kuten TassuKaveri, perustuvat vastavuoroisuuteen: lemmikinomistajat auttavat toisiaan ja hoitoa vaihdetaan krediiteillä ilman rahaa.',
          'Tämä tekee lemmikinhoidosta joustavampaa, edullisempaa ja paikallisempaa.',
        ],
      },
      {
        heading: 'Yhteenveto',
        paragraphs: [
          'Kun lemmikinhoitajaa ei löydy, vaihtoehtoja on silti olemassa. Ajoissa toimiminen, joustavuus ja yhteisölliset ratkaisut auttavat varmistamaan, että lemmikki saa turvallista ja luotettavaa hoitoa myös yllättävissä tilanteissa.',
        ],
      },
    ],
  },
  {
    slug: 'kuka-hoitaa-lemmikin-lomalla.html',
    title: 'Kuka hoitaa lemmikin lomalla? Näin löydät luotettavan ratkaisun',
    description:
      'Loman suunnittelu tuo lemmikinomistajalle huolen: kuka hoitaa lemmikin lomalla? Lue parhaat ratkaisut koiran ja kissan hoitoon matkustamisen aikana.',
    excerpt:
      'Lomaa suunnitellessa yksi tärkeimmistä kysymyksistä on, kuka hoitaa lemmikin poissaolon aikana. Tässä artikkelissa käymme läpi parhaat vaihtoehdot ja käytännön tarkistuslistan ennen matkaa.',
    publishedAt: '23.12.2025',
    author: 'TassuKaveri-tiimi',
    readTime: '6 min',
    intro: [
      'Loman suunnittelu on monelle iloinen asia, mutta lemmikinomistajalle se tuo usein mukanaan huolen: kuka hoitaa lemmikin lomalla? Kaikilla ei ole perhettä tai ystäviä, jotka voisivat auttaa, ja hoitoloiden hinnat voivat olla korkeat. Onneksi vaihtoehtoja on useita, kunhan tietää mistä etsiä.',
      'Tässä artikkelissa käymme läpi parhaat ratkaisut lemmikin hoitoon loman aikana, annamme käytännön vinkkejä koiran ja kissan hoitoon sekä kerromme, mitä tehdä, jos lemmikinhoitajaa ei tunnu löytyvän.',
    ],
    sections: [
      {
        heading: 'Miksi lemmikin hoito lomalla huolettaa monia?',
        paragraphs: [
          'Lemmikki on perheenjäsen, ja sen hyvinvointi on omistajalle tärkeää. Ajatus siitä, että lemmikki jää yksin tai vieraaseen paikkaan, voi aiheuttaa stressiä jo ennen matkaa.',
          'Lisäksi viime hetken matkat, sesonkiajat ja hoitajien rajallinen saatavuus tekevät lemmikin hoidon järjestämisestä haastavaa.',
        ],
      },
      {
        heading: 'Yleisimmät vaihtoehdot lemmikin hoitoon loman aikana',
        paragraphs: ['Kun mietitään lemmikin hoitoa matkustamisen aikana, vaihtoehtoja on useita:'],
        bullets: [
          'Perhe tai ystävät: tuttu ihminen on usein luotettavin vaihtoehto.',
          'Ammattimainen lemmikinhoitaja: ammattilainen tuo osaamista ja varmuutta, mutta kustannukset voivat nousta korkeiksi.',
          'Lemmikkihotelli tai hoitola: tarjoaa valvottua hoitoa, mutta vieras ympäristö voi olla joillekin lemmikeille stressaava.',
          'Yhteisöllinen lemmikinhoito: naapurit tai paikalliset lemmikinomistajat voivat auttaa toisiaan lähellä kotia.',
        ],
      },
      {
        heading: 'Koiran hoito lomalla – tärkeät vinkit',
        paragraphs: [
          'Koiran hoito lomalla vaatii suunnittelua. Koirat kaipaavat liikuntaa, rutiineja ja ihmiskontaktia. Varmista, että hoitaja tuntee koirasi päivittäiset tarpeet, ruokailuajat ja ulkoilurytmin.',
          'Jätä hoitajalle myös tiedot mahdollisista lääkityksistä ja eläinlääkärin yhteystiedot hätätilanteita varten.',
        ],
      },
      {
        heading: 'Kissan hoito lomalla – mitä omistajan tulee tietää',
        paragraphs: [
          'Kissan hoito lomalla on usein helpompaa kuin koiran, mutta kissat ovat herkempiä muutoksille. Paras ratkaisu on usein kotihoito, jossa kissa saa olla omassa ympäristössään.',
          'Huolehdi, että hoitaja käy säännöllisesti tarkistamassa ruoan, veden ja hiekkalaatikon sekä viettää hetken kissan kanssa.',
        ],
      },
      {
        heading: 'Mitä tehdä, jos et löydä lemmikinhoitajaa?',
        paragraphs: ['Moni kysyy: mitä tehdä, kun ei löydy lemmikinhoitajaa? Tässä muutama vinkki:'],
        bullets: [
          'Aloita etsiminen ajoissa.',
          'Kysy paikallisista ryhmistä ja yhteisöistä.',
          'Hyödynnä yhteisöllisiä alustoja.',
          'Vältä viime hetken ratkaisuja, jos mahdollista.',
        ],
      },
      {
        heading: 'Tarkistuslista ennen matkaa',
        paragraphs: ['Ennen lähtöä varmista, että hoitajalla on:'],
        bullets: [
          'Selkeät ruokinta- ja hoito-ohjeet.',
          'Eläinlääkärin yhteystiedot.',
          'Avaimet ja pääsy kotiin.',
          'Tiedot lemmikin rutiineista ja mieltymyksistä.',
        ],
      },
      {
        heading: 'Yhteisöllinen ja edullinen vaihtoehto lemmikin hoitoon',
        paragraphs: [
          'Monille lemmikinomistajille haaste ei ole pelkästään hinta, vaan luotettavan hoitajan löytäminen. Yhteisöpohjaiset ratkaisut, kuten TassuKaveri, perustuvat siihen, että lemmikinomistajat auttavat toisiaan. Hoitoa vaihdetaan krediiteillä ilman rahaa, ja apu löytyy usein läheltä omaa kotia.',
          'Tällainen malli tekee lemmikinhoidosta edullisempaa ja vahvistaa paikallista yhteisöä.',
        ],
      },
      {
        heading: 'Yhteenveto',
        paragraphs: [
          'Kun mietit, kuka hoitaa lemmikin lomalla, vaihtoehtoja on useita. Oikean ratkaisun löytäminen vaatii hieman suunnittelua, mutta se on vaivan arvoista lemmikin hyvinvoinnin vuoksi. Tärkeintä on, että lemmikki saa turvallista ja rakastavaa hoitoa myös lomasi aikana.',
        ],
      },
    ],
  },
];

type BlogArticleTranslation = Pick<
  BlogArticle,
  'title' | 'description' | 'excerpt' | 'author' | 'readTime' | 'intro' | 'sections'
>;

const englishBlogArticles: Record<string, BlogArticleTranslation> = {
  'lemmikinhoito-oulussa.html': {
    title: 'Pet care in Oulu – the best options for pet owners',
    description: 'Looking for pet care in Oulu? Compare reliable options for dogs and cats, including local community-based care.',
    excerpt: 'Looking for pet care in Oulu? This guide compares the most common options for dogs and cats, including local community-based solutions.',
    author: 'TassuKaveri Team',
    readTime: '5 min',
    intro: [
      'Arranging pet care can be difficult for pet owners in Oulu, especially during holidays and busy working weeks. Many people wonder where they can find reliable care without unnecessary stress or high costs.',
      'This guide explains the most common pet-care options in Oulu and helps you choose an arrangement that suits both you and your pet.',
    ],
    sections: [
      {
        heading: 'Why is the need for pet care growing in Oulu?',
        paragraphs: [
          'Oulu is a growing city where many residents live far from their families and relatives. Business travel, student exchanges, and holidays all increase the need for dependable pet care.',
          'Taking a pet along is not always possible, so arranging suitable care becomes essential.',
        ],
      },
      {
        heading: 'The most common pet-care options in Oulu',
        paragraphs: ['When looking for pet care in Oulu, you can consider the following options:'],
        bullets: [
          'Family and friends – a familiar and trusted choice, but not always available.',
          'Professional pet sitters – skilled care that can be expensive.',
          'Boarding facilities – supervised care in an environment that may not suit every pet.',
          'Care at home – a sitter visits the pet in its own home.',
        ],
      },
      {
        heading: 'Dog care in Oulu',
        paragraphs: [
          'Dog care usually requires regular walks, activity, and human company. Dogs often do best when their familiar routines are maintained.',
          'Care at home or help from a local sitter can be less stressful for a dog than staying at a boarding facility.',
        ],
      },
      {
        heading: 'Cat care in Oulu',
        paragraphs: [
          'Cats are often most comfortable when cared for at home. They can be sensitive to changes in their surroundings, and a familiar environment helps reduce stress.',
          'For shorter absences, regular home visits are often enough.',
        ],
      },
      {
        heading: 'What should you consider when choosing a sitter?',
        paragraphs: ['Whichever option you choose, make sure the sitter:'],
        bullets: [
          'Is reliable and easy to reach.',
          'Understands your pet’s individual needs.',
          'Receives clear instructions about feeding and routines.',
          'Knows what to do in an emergency.',
        ],
      },
      {
        heading: 'Community-based pet care in Oulu',
        paragraphs: [
          'Community-based pet care is becoming more common in Oulu. Local pet owners help one another in return, making care more flexible and affordable.',
          'This approach can keep a pet in familiar surroundings while giving the owner peace of mind.',
        ],
      },
      {
        heading: 'A local and reliable solution',
        paragraphs: [
          'Community services such as TassuKaveri are designed for local use. They connect pet owners in the Oulu area and make it possible to arrange care with credits instead of direct payments.',
        ],
      },
      {
        heading: 'Summary',
        paragraphs: [
          'There are many ways to arrange pet care in Oulu. The right choice depends on your pet’s needs, your schedule, and the options available nearby. Local community-based care gives a growing number of owners a flexible and dependable alternative.',
        ],
      },
    ],
  },
  'ilmainen-lemmikinhoito.html': {
    title: 'Free pet care – is it really possible?',
    description: 'Can pet care be free? Explore realistic low-cost options and community-based ways to arrange safe care without high expenses.',
    excerpt: 'How can you arrange pet care without high costs? We look at free and affordable options and explain when they work best.',
    author: 'TassuKaveri Team',
    readTime: '5 min',
    intro: [
      'Pet care can be expensive, particularly during holidays and longer absences. This leaves many pet owners wondering whether free pet care is genuinely possible or only a rare exception.',
      'This guide takes a realistic look at free and affordable pet-care options and the situations in which they work best.',
    ],
    sections: [
      {
        heading: 'Why does pet care usually cost so much?',
        paragraphs: [
          'Professional pet care involves responsibility, time, and often insurance. Prices can therefore become high when care is needed for several days or weeks.',
          'For many owners, cost becomes a barrier even when the need for care is genuine.',
        ],
      },
      {
        heading: 'When is free pet care possible?',
        paragraphs: ['Free pet care is possible in some situations, especially when it is based on reciprocity or community support.'],
        bullets: [
          'Family members or friends offer to help.',
          'Neighbours provide short-term care.',
          'Pet owners take turns helping one another.',
        ],
      },
      {
        heading: 'Free pet care compared with paid care',
        paragraphs: [
          'The clear advantage of free pet care is the lack of direct cost, but it often requires flexibility and good advance planning.',
          'Paid care may provide professional experience and greater certainty, but it is not affordable for everyone.',
        ],
      },
      {
        heading: 'Pet care without money – how does it work in practice?',
        paragraphs: [
          'Care without money works best as an exchange: you might care for another person’s pet today and receive help with your own pet later.',
          'This model requires clear expectations, trust, and openness from both people.',
        ],
      },
      {
        heading: 'Community-based pet care in Finland',
        paragraphs: [
          'Community-based pet care is growing in Finland as more owners look for alternatives to traditional boarding facilities.',
          'Local communities and platforms help people arrange care close to home, which can also reduce stress for the pet.',
        ],
      },
      {
        heading: 'Who is free pet care suitable for?',
        paragraphs: ['Free or reciprocal pet care is particularly suitable for:'],
        bullets: [
          'Pet owners who can be flexible with schedules.',
          'People who are also willing to help others.',
          'Local residents who value community connections.',
        ],
      },
      {
        heading: 'A community-based solution for pet care',
        paragraphs: [
          'Community services such as TassuKaveri offer a structured model in which pet owners help one another using credits instead of money. Care is built on reciprocity and local trust.',
          'This combines the benefits of free pet care with a clearer, more organised way of arranging it.',
        ],
      },
      {
        heading: 'Summary',
        paragraphs: [
          'Free pet care is possible, but it needs the right model and a supportive community. Reciprocity, trust, and advance planning are essential for arranging safe care without high costs.',
        ],
      },
    ],
  },
  'ei-loydy-lemmikinhoitajaa.html': {
    title: 'What to do when you cannot find a pet sitter – practical solutions',
    description: 'Cannot find a pet sitter? Read practical solutions and tips for arranging dog or cat care when time is short.',
    excerpt: 'Even when a sitter is unavailable at the last minute, you still have options. This guide covers quick solutions, common mistakes, and ways to prepare better next time.',
    author: 'TassuKaveri Team',
    readTime: '5 min',
    intro: [
      'Many pet owners know the situation: a trip is approaching, work or family plans change suddenly, and no pet sitter is available. It is stressful because the pet’s wellbeing must always come first.',
      'This guide offers practical steps for finding care when time is short, with specific advice for both dogs and cats.',
    ],
    sections: [
      {
        heading: 'Why can finding a pet sitter be difficult?',
        paragraphs: [
          'Finding a sitter can be particularly difficult during busy holiday periods such as summer and Christmas. Many owners look for care at the same time, so professionals and boarding facilities fill up quickly.',
          'Not every sitter is suitable for every pet. Special needs, schedules, and questions of trust can narrow the available choices further.',
        ],
      },
      {
        heading: 'Common mistakes when looking for a pet sitter',
        paragraphs: ['A lack of suitable care is often linked to these common mistakes rather than simple bad luck:'],
        bullets: [
          'Starting the search too late.',
          'Not giving the sitter clear instructions.',
          'Setting expectations that are too restrictive.',
          'Relying on one option without a backup plan.',
        ],
      },
      {
        heading: 'Quick solutions when time is short',
        paragraphs: [
          'If you are left without a sitter at the last minute, stay calm but act quickly. Start with people nearby: neighbours, friends, acquaintances, and colleagues.',
          'Local social-media groups and communities may also provide a quick solution, particularly for short-term care.',
        ],
      },
      {
        heading: 'Pet care in an emergency',
        paragraphs: [
          'In an unexpected situation, try to arrange care in surroundings that are familiar to the pet. Care at home can reduce stress and make the sitter’s task easier.',
          'Always leave written feeding and medication instructions, along with veterinary contact details for emergencies.',
        ],
      },
      {
        heading: 'Caring for a dog when your usual sitter is unavailable',
        paragraphs: [
          'Dogs need regular exercise and human contact. When a sitter is found at short notice, make sure they understand the dog’s daily routines and behaviour.',
          'Discuss walking times, feeding, and any special needs before the care begins.',
        ],
      },
      {
        heading: 'Caring for a cat at short notice',
        paragraphs: [
          'Cats often adapt best to care at home. During shorter absences, a daily visit to provide food and water and clean the litter tray may be enough.',
          'Keeping the cat’s familiar routines and environment is especially important.',
        ],
      },
      {
        heading: 'How can you avoid the same situation next time?',
        paragraphs: [
          'The best way to reduce future stress is to prepare. Begin looking for care early and keep more than one possible sitter in mind.',
          'Local community-based solutions can help you build a dependable long-term network for your pet.',
        ],
      },
      {
        heading: 'A community solution for pet care',
        paragraphs: [
          'For many owners, the main problem is not the price but finding someone trustworthy. Community services such as TassuKaveri are based on reciprocity: pet owners help one another and exchange care with credits instead of money.',
          'This makes pet care more flexible, affordable, and local.',
        ],
      },
      {
        heading: 'Summary',
        paragraphs: [
          'If you cannot find a pet sitter, options still exist. Acting early, staying flexible, and using local communities can help ensure safe and dependable care even when plans change unexpectedly.',
        ],
      },
    ],
  },
  'kuka-hoitaa-lemmikin-lomalla.html': {
    title: 'Who will care for your pet during a holiday? How to find a reliable solution',
    description: 'Planning a trip raises an important question: who will care for your pet? Compare dependable options for dogs and cats while you are away.',
    excerpt: 'One of the most important parts of planning a holiday is deciding who will care for your pet. This guide compares the best options and provides a practical pre-travel checklist.',
    author: 'TassuKaveri Team',
    readTime: '6 min',
    intro: [
      'Planning a holiday should be enjoyable, but pet owners often face one worrying question: who will look after the pet? Not everyone has family or friends who can help, and boarding facilities can be expensive. Fortunately, several alternatives are available when you know where to look.',
      'This guide compares the best holiday pet-care options, provides practical advice for dogs and cats, and explains what to do when finding a sitter seems difficult.',
    ],
    sections: [
      {
        heading: 'Why does holiday pet care worry so many owners?',
        paragraphs: [
          'A pet is part of the family, and its wellbeing matters deeply to its owner. The thought of leaving it alone or in an unfamiliar place can cause stress well before the trip.',
          'Last-minute travel, peak seasons, and limited sitter availability can make suitable care difficult to arrange.',
        ],
      },
      {
        heading: 'The most common holiday pet-care options',
        paragraphs: ['When arranging care while travelling, you can consider several options:'],
        bullets: [
          'Family or friends: a familiar person is often the most trusted choice.',
          'A professional pet sitter: professional care brings experience and confidence, but costs can be high.',
          'A pet hotel or boarding facility: supervised care that may feel stressful to some pets because of the unfamiliar environment.',
          'Community-based pet care: neighbours and local pet owners help one another close to home.',
        ],
      },
      {
        heading: 'Dog care during a holiday – essential advice',
        paragraphs: [
          'Holiday care for a dog requires planning. Dogs need exercise, routines, and human contact. Make sure the sitter understands your dog’s daily needs, feeding times, and walking routine.',
          'Leave clear details about any medication and provide the veterinarian’s contact information for emergencies.',
        ],
      },
      {
        heading: 'Cat care during a holiday – what owners should know',
        paragraphs: [
          'Arranging holiday care for a cat may be simpler than for a dog, but cats can be sensitive to change. Care at home is often best because it lets the cat remain in familiar surroundings.',
          'Ask the sitter to visit regularly, check food and water, clean the litter tray, and spend some time with the cat.',
        ],
      },
      {
        heading: 'What if you cannot find a pet sitter?',
        paragraphs: ['If finding a sitter is proving difficult, try these steps:'],
        bullets: [
          'Start looking early.',
          'Ask in local groups and communities.',
          'Use community-based platforms.',
          'Avoid last-minute arrangements whenever possible.',
        ],
      },
      {
        heading: 'Checklist before your trip',
        paragraphs: ['Before leaving, make sure the sitter has:'],
        bullets: [
          'Clear feeding and care instructions.',
          'Your veterinarian’s contact details.',
          'Keys and the access needed to enter your home.',
          'Information about your pet’s routines and preferences.',
        ],
      },
      {
        heading: 'An affordable community-based alternative',
        paragraphs: [
          'For many owners, finding a trustworthy person is as important as the price. Community services such as TassuKaveri let pet owners help one another. Care is exchanged with credits instead of money, and help can often be found close to home.',
          'This model makes pet care more affordable while strengthening the local community.',
        ],
      },
      {
        heading: 'Summary',
        paragraphs: [
          'There are several answers to the question of who should care for your pet during a holiday. Finding the right arrangement takes planning, but your pet’s wellbeing makes the effort worthwhile. The most important thing is that your pet receives safe and caring attention while you are away.',
        ],
      },
    ],
  },
};

export function localizeBlogArticle(article: BlogArticle, language: Language): BlogArticle {
  if (language === 'fi') {
    return article;
  }

  const translation = englishBlogArticles[article.slug];
  return translation ? { ...article, ...translation } : article;
}

export function getBlogArticle(slug: string, language: Language = 'fi') {
  const article = blogArticles.find((item) => item.slug === slug);
  return article ? localizeBlogArticle(article, language) : undefined;
}
