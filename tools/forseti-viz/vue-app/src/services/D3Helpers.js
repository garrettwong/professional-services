import $ from "jquery";

class D3Helpers {
    getDocumentSize($) {
        // gets device width and height
        let windowWidth = $(window).width();
        let windowHeight = $(window).height();
        let documentWidth = $(document).width();
        let documentHeight = $(document).height();
        // console.log('width, height');
        // console.log(windowWidth, windowHeight);
        // console.log(documentWidth, documentHeight);
        // console.log('-------------');
    }
}

// get device width and height
(new D3Helpers()).getDocumentSize($);

export default new D3Helpers();