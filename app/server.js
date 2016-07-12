// example bot
import botkit from 'botkit';
import Yelp from 'yelp';

console.log('starting bot');

// initialize Yelp
const opts = ({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET,
});

const yelp = new Yelp(opts);

// yelp test
console.log(yelp.search({
  term: 'food',
  location: 'Montreal',
}));

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy', 'hey'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});


// controller.hears([' '], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
//   bot.reply(message, 'Hello there!');
// });

// hungry conversation flow
// controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], function(bot, message) => {
//
//   bot.reply(message, 'Would you like food recommendations near you?');
//
//
// });


// const askWhereDeliver = (response, convo) => {
//   convo.ask('So where do you want it delivered?', (reply, conversation) => {
//     convo.say('Ok! Goodbye.');
//     convo.next();
//   });
// };
// const askSize = (response, convo) => {
//   convo.ask('What size do you want?', (reply, conversation) => {
//     convo.say('Ok.');
//     askWhereDeliver(response, convo);
//     convo.next();
//   });
// };
// const askRecommend = (response, convo) => {
//   convo.ask('Would you like food recommendations near you?',[
//     {
//       pattern: 'done',
//       callback: (response,convo) => {
//         convo.say('OK you are done!');
//         convo.next();
//       },
//     },
//     {
//       pattern: bot.utterances.yes,
//       callback: (response,convo) => {
//         convo.say('Great! I will continue...');
//         // do something else...
//         convo.next();
//       }
//     },
//     {
//       pattern: bot.utterances.no,
//       callback: (response,convo) => {
//         convo.say('Perhaps later.');
//         // do something else...
//         convo.next();
//       },
//     },
//     {
//       default: true,
//       callback: function(response,convo) {
//         // just repeat the question
//         convo.repeat();
//         convo.next();
//       }
//     }
//   ]);

  // , (reply, conversation) => {
  //
  //
  //
  //   convo.say('Awesome.');
  //   askSize(response, convo);
  //   convo.next();
  // });
// };


// controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
//   bot.startConversation(message, askRecommend);
// });


// controller.on('user_typing', (bot, message) => {
//   bot.reply(message, 'stop typing!');
// });

// controller.on('user_typing', (bot, message) => {
//   bot.reply(message, 'stop typing!');
// });


const giveResults = (response, convo, place, type) => {
  convo.say('Ok! One sec. Pulling up results.');
  convo.say(`You input ${place} as your location and ${type} as your preferred food type.`);
  convo.say('Let me take a look through my files.');
  yelp.search({ term: type, location: place })
    .then((data) => {
      let num = 0;
      data.businesses.forEach(business => {
        if (num < 1) {
          convo.say('Here is my suggestion:');
          convo.say(`You might like: ${business.name}`);
          convo.say(`Its rating is: ${business.rating}/5`);
          const attch = {
            attachments: [
              {
                fallback: `My recommendation was ${business.name}, but unfortunately the attachment is not rendering`,
                author_name: `${business.name}`,
                author_link: `${business.url}`,
                text: `${business.snippet_text}`,
                url: `${business.url}`,
                image_url: `${business.image_url}`,
                color: '#36a64f',
              },
            ],
          };
          convo.say(attch);
        }
        num += 1;
      });
      convo.next();
    })
    .catch((err) => {
      convo.say('Sorry, I could not find any results! Please try again later.');
      convo.next();
    });
};

const askDeliver = (response, convo, type) => {
  convo.ask('Where are you?', (reply, conversation) => {
    const userLocation = reply.text;
    const typeFood = type;
    giveResults(response, convo, userLocation, typeFood);
    convo.next();
  });
};

const askType = (response, convo) => {
  convo.ask('What type of food are you interested in?', (reply, conversation) => {
    convo.say('Ok.');
    const foodType = reply.text;
    askDeliver(response, convo, foodType);
    convo.next();
  });
};


controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  // start a conversation to handle this response.
  bot.startConversation(message, (err, convo) => {
    convo.ask('Would you like food recommendations near you?', [
      {
        pattern: bot.utterances.no,
        callback: (response, conversation) => {
          convo.say('Stop bothering me then! Come back when you are hungry!');
          convo.next();
        },
      },
      {
        pattern: bot.utterances.yes,
        callback: (response, conversation) => {
          convo.say('Great!');
          // do something else...
          askType(response, convo);
          convo.next();
        },
      },
      {
        default: true,
        callback: (response, conversation) => {
          // just repeat the question
          convo.say('I did not understand that');
          convo.repeat();
          convo.next();
        },
      },
    ]);
  });
});
