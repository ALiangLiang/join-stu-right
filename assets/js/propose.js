const elements = document.form.elements;
Object.entries(window.localStorage).forEach(([key, value]) => elements[key].value = value);
elements.isAnonymous.checked = (window.localStorage.isAnonymous) ? JSON.parse(window.localStorage.isAnonymous) : true;
elements.title.onchange = elements.content.onchange = function() {
    window.localStorage[this.name] = this.value;
};
elements.isAnonymous.onchange = function() {
    window.localStorage[this.name] = this.checked;
};
