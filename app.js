const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const request = require('request');
require('dotenv').config()

const app = new Koa();
const router = new Router();
const port = process.env.PORT || 4000;
app.use(bodyParser());

router.post('/webhook', async (ctx, next) => {
    let reply_token = ctx.request.body.events[0].replyToken;
    let msg = ctx.request.body.events[0].message.text;
    let excResult;
    try {
        if (msg.toString().toLowerCase() === 'currency') {
            excResult = await getCurrencyName(msg);
        } else {
            excResult = await currencyConverter(msg);
        }
        reply(reply_token, excResult.toString());
        ctx.status = 200;
    } catch (err) {
        reply(reply_token, err.info.toString());
        // ctx.status = err.code;
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(port);

function getCurrencyName(msg) {
    return new Promise((resolve, reject) => {
        request.get(`http://data.fixer.io/api/latest?access_key=0813050e48dcf44b8aec122fec13c275`, (error, response, body) => {
            let errMsg = JSON.parse(body).error;
            if (error) {
                reject(error);
            } else if (errMsg) {
                reject(errMsg);
            } else {
                let { rates } = JSON.parse(body);
                let currencyName = [];
                for (let property in rates) {
                    currencyName.push(property);
                }
                resolve(currencyName);
            }
        })
    });
}

function currencyConverter(msg) {
    return new Promise((resolve, reject) => {
        request.get(`http://data.fixer.io/api/latest?access_key=0813050e48dcf44b8aec122fec13c275`, (error, response, body) => {
            let errMsg = JSON.parse(body).error;
            if (error) {
                reject(error);
            } else if (errMsg) {
                reject(errMsg);
            } else {
                let { rates } = JSON.parse(body);
                let r = /[\-\d\.]+/g;
                let tempV, inputValue = [], inputCurrency = '';
                while ((tempV = r.exec(msg.toString())) != null) {
                    inputValue.push(tempV[0]);
                }
                inputCurrency = msg.toString().replace(/\d+([,.]\d+)?/g, '').replace(/\s/g, '').toUpperCase();
                let result = 'initial';
                if (inputValue.length > 1 || inputValue.length < 1 || isNaN(inputValue[0])) {
                    result = 'Error: Please input only value and currency e.g. \'16 usd\' or \'jpy 48\' \n\nTips: To see list of currency, please type \'currency\'';
                } else if (parseFloat(inputValue[0]) < 0) {
                    result = 'Error: Please input value more than 0 \n\n\uDBC0\uDC36 Tips: To see list of currency, please type \'currency\'';
                } else {
                    if (!inputCurrency || inputCurrency === '$') {
                        inputCurrency = 'USD';
                    }
                    if (rates.hasOwnProperty(inputCurrency)) {
                        let resultEUR = inputValue / rates[inputCurrency];
                        let resultTHB = resultEUR * rates['THB'];
                        result = `${inputValue} ${inputCurrency} = ${Math.round((resultTHB + Number.EPSILON) * 100) / 100} THB`
                    } else {
                        result = 'Error: Your currency is not found. \n\n\uDBC0\uDC36 Tips: To see list of currency, please type \'currency\'';
                    }
                }
                resolve(result);
            }
        });
    })
}

function reply(reply_token, msg) {
    let headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer {L3y3zPqSlyxfppwDcY0EKvVwNXBaTiJwUxlVpu0OGseqfEM8ynCHp+RnjBvJfcJPh3ShUPg8AHTTTHAOi7QDftQQ8kG9Wzj8CNoZm5hEi6SOAG/lxBT3OjuK/RJOQgfSNDVWcKO11obK4YkBCzjGrQdB04t89/1O/w1cDnyilFU=}`
    }
    let body = JSON.stringify({
        replyToken: reply_token,
        messages: [{
            type: 'text',
            text: msg
        }]
    })
    request.post({
        url: 'https://api.line.me/v2/bot/message/reply',
        headers: headers,
        body: body
    }, (error, response, body) => {
        console.log('status = ' + response.statusCode);
    });
}