document.addEventListener('DOMContentLoaded', function () {
    let options = {};
    var elems = document.querySelectorAll('.tap-target');
    var instances = M.TapTarget.init(elems, options);



    let element = document.getElementById('open-menu-btn');
    console.log(element);
    element.addEventListener('click', function() {
        // get instance
        
        let instanceEls = document.getElementsByClassName('tap-target');
        let instance = M.TapTarget.getInstance(instanceEls[0]);
        console.log(instance);
        instance.open();
    });
});