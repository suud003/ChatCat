const check1 = document.getElementById('check1');
const check2 = document.getElementById('check2');
const btnAccept = document.getElementById('btn-accept');
const btnCancel = document.getElementById('btn-cancel');

function updateButton() {
  if (check1.checked && check2.checked) {
    btnAccept.classList.add('enabled');
  } else {
    btnAccept.classList.remove('enabled');
  }
}

check1.addEventListener('change', updateButton);
check2.addEventListener('change', updateButton);

btnAccept.addEventListener('click', () => {
  if (check1.checked && check2.checked) {
    window.consentAPI.accept();
  }
});

btnCancel.addEventListener('click', () => {
  window.consentAPI.decline();
});
