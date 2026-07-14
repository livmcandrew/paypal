const toggleBtns = document.querySelectorAll('.toggle-btn');
const items = document.querySelectorAll('.item');
let int = "";

function updateItems() {
  items.forEach(item => {
    const form = item.querySelector('form');
    const button = item.querySelector('button');
    const path = item.dataset[int.toLowerCase()];
    const intInput = item.querySelector('.int-input');

    form.setAttribute('action', path);
    intInput.setAttribute('value', int);

    // swap button style based on active provider
    button.classList.remove('feature-button', 'pfeature-button');

    if (int === 'PP') {
      button.classList.add('pfeature-button');
      console.log('integration is set to = ' + int);
    } else if (int === 'BT') {
      button.classList.add('feature-button');
      console.log('integration is set to = ' + int);
    } else {
      // no filter selected — pick a default, e.g. neutral/feature-button
      button.classList.add('feature-button');
    }

    // disable the button if no toggle is selected
    button.disabled = int === "";
  });
  
}

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const isAlreadyActive = btn.classList.contains('active');

    toggleBtns.forEach(b => b.classList.remove('active'));

    if (!isAlreadyActive) {
      btn.classList.add('active');
      int = btn.dataset.filter;
    } else {
      int = "";
    }

    updateItems();
  });
});

updateItems();