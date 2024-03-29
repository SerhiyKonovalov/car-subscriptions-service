addEventListener("DOMContentLoaded", async () => {
    let user = sessionStorage.getItem('user');

    if (user === null) {
        window.location.href = 'sign-in.html';
    }

    user = JSON.parse(user);
    if (user['isVerified'] === true) {
        window.location.href = 'cabinet-inactive.html';
    }

    const id = user['id'];

    await sendCodeToUserEmail(id);

    document.getElementById('resendCode').addEventListener('click', async () => {
        alert('Код підтвердження було відправлено на вашу пошту');
        await sendCodeToUserEmail(id);
    });

    document.getElementById('checkConfirmCode').addEventListener('click', async () => {
        await checkConfirmCode(id);
    });
});

async function checkConfirmCode(id) {
    let code = document.getElementById('confirm-code').value;
    let url = `https://circular-ally-383113.lm.r.appspot.com/api/v1/users/verify-email?id=${id}&code=${code}`;
    let response = await fetch(url, {
        method: 'PATCH'
    });
    let status = response.status;
    if (status === 200) {
        user['isVerified'] = true;
        window.location.href = 'cabinet-inactive.html';
    } else {
        alert('Невірний код підтвердження');
    }

}

async function sendCodeToUserEmail(id) {
    const response = await fetch(`https://circular-ally-383113.lm.r.appspot.com/api/v1/users/generate-verification-code?id=${id}`, {
        method: 'PATCH'
    });
    let status = response.status;
    if (status !== 200) {
        alert('Помилка почтового сервісу! Спробуйте пізніше');
    }
}




