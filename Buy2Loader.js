var cheerio = require('cheerio');
var superagent = require('superagent');
var agent = superagent.agent();
var assert = require('assert');

var webSite = "www.buy2.co.il";
var siteMapUrl = "http://www.buy2.co.il/HtmlSiteMap";
var buy2Deals = [];

var InProcessPagesNumber = 0;
var dealsMapper =  {};
var loadingDb = {};

String.prototype.hashCode = function() {
        var hash = 0, i = 0, len = this.length;
        while ( i < len ) {
                hash  = ((hash << 5) - hash + this.charCodeAt(i++)) << 0;
        }
        return hash;
    };

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
       
function loadBuy2ProductsPage(pageUrl,categoryName,callback) {
    setTimeout(function(){
     agent.get(encodeURI(pageUrl),function(error,html){
        if(!error){
            var deals = [];
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html.text);

            // Finally, we'll define the variables we're going to capture
             $('a.product-box').each(function(i,element){
                    var productBox = $(this);
                    var deal = { webSite : webSite, 
                                 categoryName : categoryName, 
                                 title : productBox.find('span.title-link').first().text(), 
                                 link :productBox.attr('href'), 
                                 imageUrl: productBox.find('img.productimg').first().attr('src'), 
                                 price: productBox.find('div.discount-detail').first().text()
                    };
                    if(!dealsMapper.hasOwnProperty(deal.link.hashCode()))
                    {
                        dealsMapper[deal.link.hashCode()]="";
                        deals.push(deal);
                    }
            });
            callback && callback(null,deals);
        }
        
      });
    },getRandomInt(10,10000));
}

function deleteDeals(callback) {
     loadingDb.collection('Deals').deleteMany({},function(err,result){
         console.log(result);
         callback(err);
      });
}

function loadDeals(callback)
{
     agent.get(siteMapUrl,function(error,html){
        
        if(!error){
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html.text);

            // Finally, we'll define the variables we're going to capture
            $('#content').find('a').each(function(i,element){
                var a = $(this);
                var pageUrl = a.attr('href');
                var pageTitle = a.text();

                if (pageTitle == "buy2print") 
                {
                    return false;
                }
                ++InProcessPagesNumber;
                
                loadBuy2ProductsPage(pageUrl,pageTitle,
                    function(err,data){
                        if (!err)
                        {
                            console.log("Number of deals:" + data.length + " in Page:" + pageTitle);
                            if (data.length>0) {
                                loadingDb.collection('Deals').insert(data,function(err,objects){
                                    if(err) console.log(err);
                                });
                            }
                            
                            --InProcessPagesNumber;
                            if (InProcessPagesNumber==0) {
                            callback && callback(null);
                            }
                        }
                    });
            
            });
        }
    });
}
module.exports = {
  Load : function(db,callback) {
      loadingDb = db;
      
      deleteDeals(function(err) {
          if (!err) {
            loadDeals(function(err){
                if(err) console.log(err);
                callback();
            });    
          }
      });
     
  }
};