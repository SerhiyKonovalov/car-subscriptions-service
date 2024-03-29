
let user = sessionStorage.getItem('user');
let userJson = JSON.parse(user);
const subId = userJson['subscriptionId'];

window.addEventListener("DOMContentLoaded", (event) => {
   
        getSubscription(subId);
    
});

async function getSubscription(id){
         let url = 'https://circular-ally-383113.lm.r.appspot.com/api/v1/subscriptions/' + id;
		let response = await fetch(url);
	    let responseJSON = await response.json();
		let monthPrice = responseJSON['monthPrice'];
        document.getElementById('month-price').textContent = monthPrice;
}

 function getApprovingURL(){
    price = document.getElementById('month-price').textContent;
   
    let paymentJson = {
        "price": price,
        "currency": "USD",
        "method": "paypal",
        "intent": "sale",
        "description" : "Payment for car subscription"
    };

   fetch(`https://circular-ally-383113.lm.r.appspot.com/api/v1/pay/paypal/${subId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentJson)
    }).then(response => response.json())
    .then(result => {
        if (result['status'] === 'success') {
            window.location.href = result['message'];
        }else{
            alert("Не вдалося створити оплату(тут повинне бути посилання на сторінку error payment)");
        }
      console.log(result);
    })
    



           
}
