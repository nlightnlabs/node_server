//Exchange rate api
const axios = require('axios');

const getCurrency = async (req, res)=>{

    const options = {
    method: 'GET',
    url: 'https://currency-converter5.p.rapidapi.com/currency/convert',
    params: {
        format: 'json',
        from: req.fromCurrency,
        to: req.toCurrency,
        amount: '1'
    },
    headers: {
        'X-RapidAPI-Key': '6b9dc1a1d0msh313b06a72b61beap18df1ejsn991643b7367c',
        'X-RapidAPI-Host': 'currency-converter5.p.rapidapi.com'
    }
    };

    try {
        const response = await axios.request(options);
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }

}

const req = {
    fromCurrency: "EUR",
    toCurrency: "USD",
}
getCurrency(req);
