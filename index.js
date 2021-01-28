const express = require("express");
const http = require("https");
const app = express();
const axios = require('axios')
const port =  process.env.PORT || 3002;
const Shopify = require("shopify-api-node");
require('dotenv').config()


const shopify2 = new Shopify({
    shopName: "wigs-hairpieces",
    apiKey: process.env.KEY_OUTLET,
    password: process.env.PASS_OUTLET,
    autoLimit: true,
    bucketSize: { calls: 5, interval: 1000, bucketSize: 35 },
    apiVersion: "2021-01",
  });
  
  const shopify1 = new Shopify({
    shopName: "wigscom",
    apiKey: process.env.KEY_WIGS,
    password: process.env.PASS_WIGS,
    autoLimit: true,
    bucketSize: { calls: 5, interval: 1000, bucketSize: 35 },
    apiVersion: "2021-01",
  });




function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
let return_arr = []
async function getData2(search) {
  
    let response = await axios.get(`https://scripts.wigs.com/integromat/parent-sku-to-id.php?parent_sku=${search}&store=wigoutlet.com`).catch(err => console.log(err))
    if(isEmpty(response.data)) {
        return_arr.push({sku: search, info: `Unknown parent sku, can't find any matches`}) 
          return return_arr
    } else {
    let outlet_id = response.data.response.product_id

    let product = await shopify2.product.get(outlet_id).catch(err=>err);
    // console.log(product)
   if(product.variants !== undefined) {
  

    var childPromises = product.variants.map(async (item) => {
    //   console.log(item)
      let response2 = await axios.get(`https://scripts.wigs.com/integromat/parent-sku-to-id.php?parent_sku=${search}&store=wigs.com`).catch(err => console.log(err))
    
      if(isEmpty(response2.data)) {
        return_arr.push({sku: item.sku, info: `Unknown variant sku, can't find any matches`}) 
         
    } else {

      let sku = item.sku;
     
     
        let img_id_outlet = item.image_id;
        let wigs_id = response2.data.response.product_id;
        // console.log("WIG ID", wigs_id)
        let wigs_product = await shopify1.product.get(wigs_id);
        if (wigs_product.variants.find((x) => x.sku == sku)) {
          let var_id = wigs_product.variants.find((x) => x.sku == sku).id;
  
          let image_id2 = wigs_product.variants.find((x) => x.sku == sku && (x.option1 == item.option1 || x.option1 == item.option2));
        //   console.log('This id', image_id2)
          if(image_id2){
              let image_id = image_id2.image_id
              let image = await shopify1.productImage.get(wigs_id, image_id);
              if(image){
            //   console.log("Imad id", image);
              let src_wigs = image.src;
              let alt_wigs = image.alt;
              if(img_id_outlet && outlet_id ) {
              let delete_img = await shopify2.productImage.delete(
                outlet_id,
                img_id_outlet
              ).catch(err => console.log(err))
            //   console.log("Delete", delete_img);
              }
              let new_img = await shopify2.productImage.create(outlet_id, {
                variant_ids: [item.id],
                src: src_wigs,
                alt: alt_wigs,
              });
         console.log("This image", new_img.id);
        
              if(new_img){
                return_arr.push({sku: sku, info: 'Successfully uploaded'}) 
               
              }
              else{
                return_arr.push({sku: sku, info: 'Failed upload an image'}) 
              }
            }
            else{
                return_arr.push({sku: sku, info: 'Image is undefined(Wigs.com)'}) 
            }
          }
          else{
            return_arr.push({sku: sku, info: 'Image is undefined(Wigs.com)'}) 
          }
          
        }
        else{
            return_arr.push({sku: sku, info: `Unknown variant sku, can't find any matches`}) 
            
        }
        
      }
      
      
    })
    return Promise.all(childPromises)
    // console.log(return_arr)
    // return return_arr

  
  }
  else{
    return_arr.push({sku: search, info: `Unknown variant sku, can't find any matches`}) 
    return return_arr;
  }
    
    }
}







app.get("/sku=:sku", ( req, res, next) => {
 
    Promise.all( [getData2(req.params.sku)]).then(response => {
        
        console.log( return_arr)
        res.send(return_arr);
        return_arr = []
    }).catch(next)
  
    
  })
  
  app.listen(port, () =>
    console.log(`Hello world app listening on port ${port}!`)
  );
