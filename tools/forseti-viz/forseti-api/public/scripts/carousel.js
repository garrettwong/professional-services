document.addEventListener('DOMContentLoaded', function () {
    var elems = document.querySelectorAll('.carousel');

    let options = { duration: 500 }
    
    var instances = M.Carousel.init(elems, options);
});