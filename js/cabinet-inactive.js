// Зміна статичних данних на динамічні / редірект в залежності від статусу підписки користувача 

addEventListener('DOMContentLoaded', async function () {
    let user = sessionStorage.getItem('user');
    if (user != null) {
        let userJson = JSON.parse(user);
        let subId = userJson['subscriptionId'];
        if (subId === 0) {
            document.getElementById('form').addEventListener('submit', function (event) {
                event.preventDefault();
                const form = document.getElementById('form');

                let error = formValidate(form);

                if (error !== 0) {
                    alert("Заповніть обов'язкові поля!")
                } else {
                    submitSubscriptionForm();
                }
            })

            let username = document.getElementById('username');
            let email = document.getElementById('email');
            let phone = document.getElementById('phone');
            let emailVerified = document.getElementById('isVerified');
            let jsonName = userJson['name'];
            let jsonSurname = userJson['surname'];
            let jsonEmail = userJson['email'];
            let jsonPhone = userJson['phone'];
            let jsonIsVerified = userJson['isVerified'];
            username.innerHTML = jsonName + ' ' + jsonSurname;
            email.innerHTML = jsonEmail;
            phone.innerHTML = jsonPhone;
            if (jsonIsVerified === true) {
                emailVerified.innerHTML = 'Пошта підтверджена';
                await setSubscriptionForm(); // Встановлення інформації про автомобіль в форму тільки якщо пошта підтверджена
            } else {
                emailVerified.innerHTML = 'Ваша пошта ще не підтверджена. Щоб мати змогу оформити підписку, будь ласка підтвердіть пошту: <a href="email-confirm.html" class="blue-button">Підтвердити</a>';
            }
        } else if (subId > 0) {
            if (sessionStorage.getItem('subscription') == null) {
                fetch('https://circular-ally-383113.lm.r.appspot.com/api/v1/subscriptions/' + subId)
                    .then(response => response.json())
                    .then(json => sessionStorage.setItem('subscription', JSON.stringify(json)));
                window.location.href = 'cabinet-active.html';
            }
        }
    } else {
        window.location.href = 'sign-in.html';
    }
});

async function setSubscriptionForm() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let carId = urlParams.get('carId');
    if (carId !== null) {
        let formDiv = document.getElementById('subscriptionForm');
        formDiv.classList.remove('visually-hidden');
        let carIdValue = document.getElementById('carIdValue');
        carIdValue.value = carId;
        await setCarInfoToForm(carId);
    }
}

async function setCarInfoToForm(carId) {
    let response = await fetch('https://circular-ally-383113.lm.r.appspot.com/api/v1/cars/' + carId);
    let status = response.status;
    if (status > 299) {
        alert('Помилка при завантаженні інформації про автомобіль. Спробуйте пізніше');
        window.location.href = 'error.html';
    }
    let car = await response.json();
    let carNameJson = car['name'];
    let carModelJson = car['model'];
    let carBrandJson = car['brand'];
    let carYearJson = car['year'];
    let carColorJson = car['color'];
    let carPriceJson = car['price'];

    let carName = document.getElementById('carName');
    let carModel = document.getElementById('carModel');
    let carBrand = document.getElementById('carBrand');
    let carYear = document.getElementById('carYear');
    let carColor = document.getElementById('carColor');

    carName.value = carNameJson;
    carModel.value = carModelJson;
    carBrand.value = carBrandJson;
    carYear.value = carYearJson;
    carColor.value = carColorJson;

    await setPerMonthPrice(carPriceJson);
}

async function setPerMonthPrice(totalPrice) {
    let monthsTwelveDuplicate = document.getElementById('total_month_12_duplicate');
    let monthsEighteen = document.getElementById('total_month_18');
    let monthsTwentyFourths = document.getElementById('total_month_24');
    let monthsTwentyEight = document.getElementById('total_month_30');

    totalPrice += 300; // Додавання вартості обслуговування
    let priceTwelve = calculatePrice(totalPrice, 12);
    let priceEighteen = calculatePrice(totalPrice, 18);
    let priceTwentyFourths = calculatePrice(totalPrice, 24);
    let priceTwentyEight = calculatePrice(totalPrice, 30);

    monthsTwelveDuplicate.innerHTML += ` ${priceTwelve}$/міс`;
    monthsEighteen.innerHTML += ` ${priceEighteen}$/міс`;
    monthsTwentyFourths.innerHTML += ` ${priceTwentyFourths}$/міс`;
    monthsTwentyEight.innerHTML += ` ${priceTwentyEight}$/міс`;
}

async function submitSubscriptionForm() {
    let form = document.getElementById('form');
    let formData = new FormData(form);

    let user = sessionStorage.getItem('user');
    let userJson = await JSON.parse(user);

    let userId = userJson['id'].toString();
    let carId = formData.get('carId');
    let monthsString = formData.get('months');
    let passport = formData.get('passport_num');
    let ipn = formData.get('ipn_num');
    let contact = formData.get('contact');

    let months = monthsString.slice(0, 2); // кількість місяців
    let monthPay = parsePayPerMonth(monthsString); // сума грошей за місяць
    if (monthPay === null) {
        alert("Помилка при введені даних про кількість місяців, будь ласка, виберіть зі списку");
        return;
    }

    let data = {
        "monthPrice": monthPay,
        "totalMonths": months,
        "userId": userId,
        "carId": carId,
        "passportNumber": passport,
        "ipnNumber": ipn,
        "socMediaLink": contact
    };
    console.log(JSON.stringify(data));

    await fetch('https://circular-ally-383113.lm.r.appspot.com/api/v1/subscriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
    }).then(async response => {
        if (response.status === 201) {
            alert('Заявка на підписку успішно оформлена!');
            window.location.href = 'cabinet-expected.html';
        } else {
            let error = await response.json();
            let errorMessage = error['errorMessage'];
            let errorCode = error['code'];
            console.log("Error code: " + errorCode + " Error message: " + errorMessage);
            alert('Помилка при оформленні підписки. Спробуйте пізніше');
        }
    });
}

function parsePayPerMonth(monthsString) {
// Регулярний вираз для вилучення суми грошей
    let regex = /\d+(\.\d+)?/;

// Знаходження суми грошей в рядку
    let match = monthsString.match(regex);

    if (match === null) {
        return null;
    } else {
        return match[0];
    }
// Отримання першого знайденого збігу (суми грошей)

}

function calculatePrice(fullPrice, months) {
    // Розрахунок ціни за місяць
    let monthlyPrice = fullPrice / months;

    // Округлення до найближчого числа, кратного 50
    let roundedPrice = Math.round(monthlyPrice / 10) * 10;

    roundedPrice = roundedPrice - 0.1;
    return roundedPrice;
}

// Можливість редагування імені

function editText() {
    // Отримую посилання на span
    let textElement = document.getElementById("username");
    // Отримую поточний текстовий вміст цього елемента
    let currentText = textElement.innerHTML;
    // Замінюю текст на форму для редагування
    textElement.innerHTML = '<input type="text" id="edit-input" value="' + currentText + '"><button onclick="saveText()">Зберегти</button>';
}

function saveText() {
    let inputElement = document.getElementById("edit-input");
    // Отримую введене користувачем значення
    let newText = inputElement.value;
    // Отримую посилання на HTML-елемент, що містить текст, який ми хочемо редагувати
    let textElement = inputElement.parentNode;
    // Замінюю форму для редагування на нове ім'я
    textElement.innerHTML = newText;
}


//Випадаюче меню:

/////Auto/////

jQuery(($) => {
    $('.inactive__auto').on('click', '.inactive__head-auto', function () {
        if ($(this).hasClass('open')) {
            $(this).removeClass('open');
            $(this).next().fadeOut();
        } else {
            $('.inactive__head-auto').removeClass('open');
            $('.inactive__list-auto').fadeOut();
            $(this).addClass('open');
            $(this).next().fadeIn();
        }
    });

    $('.inactive__auto').on('click', '.inactive__item-auto', function () {
        $('.inactive__head-auto').removeClass('open');
        $(this).parent().fadeOut();
        $(this).parent().prev().text($(this).text());
        $(this).parent().prev().prev().val($(this).text());
    });

    $(document).click(function (e) {
        if (!$(e.target).closest('.inactive__auto').length) {
            $('.inactive__head-auto').removeClass('open');
            $('.inactive__list-auto').fadeOut();
        }
    });
});

/////Term/////

jQuery(($) => {
    $('.inactive__term').on('click', '.inactive__head-term', function () {
        if ($(this).hasClass('open')) {
            $(this).removeClass('open');
            $(this).next().fadeOut();
        } else {
            $('.inactive__head-term').removeClass('open');
            $('.inactive__list-term').fadeOut();
            $(this).addClass('open');
            $(this).next().fadeIn();
        }
    });

    $('.inactive__term').on('click', '.inactive__item-term', function () {
        $('.inactive__head-term').removeClass('open');
        $(this).parent().fadeOut();
        $(this).parent().prev().text($(this).text());
        $(this).parent().prev().prev().val($(this).text());
    });

    $(document).click(function (e) {
        if (!$(e.target).closest('.inactive__term').length) {
            $('.inactive__head-term').removeClass('open');
            $('.inactive__list-term').fadeOut();
        }
    });
});

/////Color/////

jQuery(($) => {
    $('.inactive__color').on('click', '.inactive__head-color', function () {
        if ($(this).hasClass('open')) {
            $(this).removeClass('open');
            $(this).next().fadeOut();
        } else {
            $('.inactive__head-color').removeClass('open');
            $('.inactive__list-color').fadeOut();
            $(this).addClass('open');
            $(this).next().fadeIn();
        }
    });

    $('.inactive__color').on('click', '.inactive__item-color', function () {
        $('.inactive__head-color').removeClass('open');
        $(this).parent().fadeOut();
        $(this).parent().prev().text($(this).text());
        $(this).parent().prev().prev().val($(this).text());
    });

    $(document).click(function (e) {
        if (!$(e.target).closest('.inactive__color').length) {
            $('.inactive__head-color').removeClass('open');
            $('.inactive__list-color').fadeOut();
        }
    });
});


// Валідація полів на заповнення 


function formValidate(form) {
    let error = 0;
    let formReq = document.querySelectorAll('._req'); //required - обов'язкове поле

    for (let index = 0; index < formReq.length; index++) {
        const input = formReq[index];
        formRemoveError(input);

        if (input.value === '') { //перевірка чи поле заповленене
            formAddError(input);
            error++;
        }
    }
    return error;
}

function formAddError(input) {
    input.parentElement.classList.add('_error'); //добавляю батьківському об'єкту клас error
    input.classList.add('_error'); //добавляю самому об'єкту клас error
}

function formRemoveError(input) {
    input.parentElement.classList.remove('_error'); //забираю клас error у батьківського об'єкта
    input.classList.remove('_error'); //забираю клас error у об'єкта
}


// Валідація номеру паспорта регулярним виразом 

let result = document.querySelector('#result');
let form = document.querySelector('#form');

form.addEventListener('submit', function (e) {
    e.preventDefault();
    checkPassportNumber(this.passport.value);
})

function checkPassportNumber(passportNo) {
    let passportRE = /^\d\d\d\d\d\d\d\d-\d\d\d\d\d$/;
    if (passportNo.match(passportRE)) {
        result.innerHTML = 'Номер паспорту введено правильно';
    } else {
        result.innerHTML = 'Номер паспорту введено <strong><u>не правильно</u></strong><br>Приклад: 10101010-10101';
    }
}

// Валідація ІПН регулярним виразом 

var result2 = document.querySelector('#result2');
form = document.querySelector('#form');

form.addEventListener('submit', function (e) {
    e.preventDefault();
    checkIpnNumber(this.ipn.value);
})

function checkIpnNumber(ipnNo) {
    var ipnRE = /^\d\d\d\d\d\d\d\d\d\d$/;
    if (ipnNo.match(ipnRE)) {
        result2.innerHTML = 'Номер паспорту введено правильно';
    } else {
        result2.innerHTML = 'Номер паспорту введено <strong><u>не правильно</u></strong><br>Приклад: 0101010101';
    }
}


/*// Динамічний header в залежності від того, чи користувач залогований

function updateHeader() {
  const headerEl = document.querySelector('.header__last-item');
  const userStr = sessionStorage.getItem('user');
  if (userStr) {
    // Якщо користувач залогований, виводимо кнопки "Мій кабінет/Вийти"
    const user = JSON.parse(userStr);
    headerEl.innerHTML = `
    <li class="nav-item">
      <a class="nav-link active header__cabinet header__active" aria-current="page" href="#">Мій кабінет</a><span class="header__slash">/</span><a class="header__exit" id="logoutButton" href="#">Вийти</a>
    </li>
    `;
    const logoutBtn = headerEl.querySelector('#logout-btn');
    logoutBtn.addEventListener('click', logoutUser);
  } else {
    // Якщо користувач не залогований, виводимо кнопки "Увійти/Зареєструватись"
    headerEl.innerHTML = `
    <li class="nav-item">
      <a class="nav-link active header__sign-in" aria-current="page" href="sign-in.html">Увійти</a><span class="header__slash">/</span><a class="header__sign-up" href="sign-up.html">Зареєструватись</a>
    </li>
    `;
  }
}*/


// Розлогування користувача та редірект на сторінку входу

function logoutUser() {
    sessionStorage.removeItem('user'); // Видалення з сесії

    window.location.replace('sign-in.html'); // Редірект на сторінку входу
}
