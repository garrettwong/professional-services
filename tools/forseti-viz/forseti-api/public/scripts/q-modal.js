let modalInstances = [];

document.addEventListener('DOMContentLoaded', function () {
   
    modalInstances = initializeModals();


    initSubmitText();
});

function initializeModals() {
    var elems = document.querySelectorAll('.modal');
    let options = {
        onOpenStart: function(a, b) {
            console.log(a, b);

            let href = b.getAttribute('href');

            console.log(href);

            let qNumReplaced = href.replace('#!/Q/', '');

            document.getElementById('q-num').innerText = qNumReplaced;
        }
    };

    var instances = M.Modal.init(elems, options);

    return instances;
}


function initSubmitText() {
    let submitTextBtn = document.getElementById('submit-text');
    submitTextBtn.addEventListener('click', function(event) {
        console.log(event);
        let textToAssociate = document.getElementById('text-to-associate').value;
        console.log(textToAssociate);
        
        let modalInstance = M.Modal.getInstance($('.modal'));

        alert(textToAssociate);
        
        if (textToAssociate !== '') {
            modalInstance.close();
        }
    });
}