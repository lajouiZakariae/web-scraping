/**
 * Scraping Amazon's Keyboards Page
 */

const cheerio = require('cheerio');
const axios = require('axios');
const { writeFile, readdir, unlink, writeFileSync } = require('fs');
const path = require('path');

const products = [];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)',
  'Accept-Language': 'en-US, en;q=0.5',
};

const url =
  'https://www.amazon.com/s?k=gaming+keyboard&pd_rd_r=df368886-9165-4137-b69b-f3eb3a49226a&pd_rd_w=Zk55X&pd_rd_wg=TNYL9&pf_rd_p=12129333-2117-4490-9c17-6d31baf0582a&pf_rd_r=5MZQAK904PBKN4HH18H9&ref=pd_gw_unk';

async function loadPage() {
  return axios
    .get(url, { headers: HEADERS })
    .then(({ data }) => {
      return cheerio.load(data); // Load the scraper
    })
    .catch((err) => console.log(err));
}

loadPage()
  .then(($) => {
    // HTML product card
    const productsCards = $(
      '.s-result-list.s-search-results [data-index]'
    ).filter(function () {
      return $(this).data('uuid');
    });

    // HTML Carousel of products
    const carousels = $('.s-result-list.s-search-results [data-index]').filter(
      function () {
        return $(this).find('.a-carousel-row-inner').length;
      }
    );

    productsCards.each(function () {
      extractDataFromEl($(this));
    });

    carousels.each(function () {
      $(this)
        .find('ol')
        .children()
        .each(function () {
          extractDataFromEl($(this));
        });
    });
  })
  .then(() => {
    saveProducts();
    saveImages();
  });

/**
 * Extract Data From a product card HTML element
 */
function extractDataFromEl(el) {
  if (
    el.find('h2 > a > span').text().length &&
    el.find('.a-price-whole').text().length
  ) {
    products.push({
      image_url: el.find('.s-image').attr('src'),
      image_path: new URL(el.find('.s-image').attr('src')).pathname
        .split('/')
        .pop(),
      url: `https://amazon.com/${el.find('h2 > a').attr('href')}`,
      title: el.find('h2 > a > span').text(),
      price: parseFloat(
        el.find('.a-price-whole').text() + el.find('.a-price-fraction').text()
      ),
    });
  }
}

/**
 * Save Into a CSV file
 */
const saveProducts = () => {
  const headers = Object.keys(products[0]).join(', ').concat('\n');

  const body = products.reduce((acc, note) => {
    return (
      acc +
      Object.values(note)
        .map((val) =>
          typeof val === 'string'
            ? '"' + val + '"'
            : '"' + ('' + val).replace('.', ',') + '"'
        )
        .join(', ')
        .concat('\n')
    );
  }, '');

  writeFileSync('data.csv', headers + body);
};

/**
 * Save All images Locally
 */
function saveImages() {
  readdir('images', function (_, files) {
    for (const file of files) {
      unlink(path.join('images', file), () => {});
    }
  });

  products.forEach(({ image_url, image_path }) => {
    axios
      .get(image_url, { responseEncoding: 'base64' })
      .then(({ data }) =>
        writeFile(
          'images/' + image_path,
          data,
          { encoding: 'base64' },
          (err) => err && console.log(err)
        )
      );
  });
}
