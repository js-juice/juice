import Util from '../Util/Core.mjs';
import Emitter from '../Event/Emitter.mjs';
import Request from '../HTTP/Request.mjs';

import FormInput from './FormInput.mjs';
import FormField from './FormField.mjs';

import FormInformation from './Info.mjs';

import { DistinctArray } from '../Symbol/Array.mjs';
import Validator from '../../data/validate/Validator.mjs';

import Presets from './Presets.mjs';
import FormHistory from './History.mjs';
import { Input } from 'postcss';
import Reflection from '../Data/Reflection.mjs';
import Dot from '../Data/Dot.mjs';
import { path as objectPath, setPath as setObjectPath } from '../Obj/Object.mjs'
import FormErrors from './FormErrors.mjs';

class FormBasic extends Emitter {

    dom;
    default = {};
    history;
    inputs = {};
    fields = {};
    values = {};
    reflections = [];
    valid;
    changed;
    #defined = {};
    #hooks = {};
    #valid = new DistinctArray();
    #invalid = new DistinctArray();
    #required = new DistinctArray();
    name = null;
    errors;

    debug = false;

    static Input = FormInput;
    static Field = FormField;

    constructor( selector, scope=document ){
        super();
        this.dom = Util.type( selector, 'string' ) ? scope.querySelector( selector ) : selector;
        this.id = this.dom.getAttribute('id');
        this.name = this.dom.hasAttribute('name') && this.dom.getAttribute('name') || this.id;
        this.history = new FormHistory( this );
        this.#valid = new DistinctArray();
        this.#required = new DistinctArray();
        this.#invalid = new DistinctArray();
        this.changed = new DistinctArray();
        this.submitButton = this.dom.querySelector('form-submit, [type="submit"]') ||  document.querySelector(`[type="submit"][form="${this.id}"]`);
        
        if(this.dom.classList.contains('initready')) this.noinput = true;
        if(this.dom.querySelector('.recapcha')) this.hasCapcha = true;

        this.on('bound', () => { this.errors = new FormErrors(this); })

        if(this.constructor.name == 'FormBasic') this.initialize();
        
        this.dom.classList.add('ready');
        this.debug = true;
        
        
    }

    get elements(){
        return this.dom.elements;
    }

    get action(){
        return this.dom.getAttribute('action');
    }

    set action(action){
        return this.dom.setAttribute('action', action);
    }

    get method(){
        return this.dom.getAttribute('method');
    }

    set method(method){
        return this.dom.setAttribute('method', method);
    }

    get disabled(){
        return this.#defined.disabled;
    }

    set disabled( disabled ){
      //  app.log('form disable', disabled);
       // if(this.#defined.disabled === disabled) return false;
        if(disabled){
            //IS Disabled
            if( this.submitButton ){
                if(!this.submitButton.hasAttribute('disabled')){
                    this.submitButton.setAttribute('disabled', '');
                    const ring = this.submitButton.$.first('loader-ring');
                    if(ring) ring.reset();
                }
            }
        }else{
            //NOT Disabled
            if( this.submitButton ){
                if(this.submitButton.hasAttribute('disabled'))
                    this.submitButton.removeAttribute('disabled');
                if(this.submitButton.$.class.has('loader')){
                    const ring = this.submitButton.$.first('loader-ring');
                    ring.reset();
                }
            }
        }
        this.#defined.disabled = disabled;
    }

    get state(){
        return this.#defined.state;
    }

    set state( state ){
        if( state === this.#defined.state ) return false;
        switch(state){
            case 'error':
            break;
            case 'saved':
            break;
            case 'unsaved':
            break;
        }
        this.#defined.state = state;
        this.emit( 'state', state );
    }

    showCapcha(){

    }

    get savable(){
        return this.#defined.savable;
    }

    set savable(value){

        this.#defined.savable = value;

        this.dom.classList[value === true ? 'add' : 'remove' ]('savable');

        if(this.hasCapcha){
            this.showCapcha();
        }else{
            this.disabled = !value;
        }

        this.emit( value ? 'savable' : 'unsavable' );
    }

    get valid(){
        return this.#defined.valid;
    }

    set valid(value){
        if(this.#defined.valid === value) return false;
        this.#defined.valid = value;
        if(value == true){
            this.disable = false;
        }else{
            this.disable = true;

        }
        this.emit( value == true ? 'valid' : 'invalid' );
    }

    reflectTo( ...targets ){
        
        const self = this;

       if( !self.reflections.length ){

            this.reflections = targets;
            const tmp = { ...this.values };
            const handeler = {
                set(target, key, value) {
                    if(!self.reflections.length) return Reflect.set(...arguments);
                    self.reflections.forEach( t => Dot.set( key, value, t ) );
                    return Reflect.set(...arguments);
                }
            };

            this.values = new Proxy( tmp, handeler );
            
       }else{
            self.reflections.push(...targets);
       }

      // app.log('Add Reflect', targets);

       targets.forEach((t) => {
            for( let key in self.values ){
                setObjectPath( t, key, self.values[key] );
            }
        });

    }

    reflectBlur( ...targets ){
       //Remove Targets from reflect
        for( let ii=0;ii<targets.length;ii++){
            const target= targets[ii];
            for( let i=0;i<this.reflections.length;i++){
                app.log('REMOVE REFLECT', this.reflections[i]);
                if(this.reflections[i] === target ) this.reflections.splice(i, 1);
            }
        }
    }

    stats(){
        return {
            changed: this.count('fields', 'changed'),
            valid: this.count('fields', 'valid'),
            required: this.count('fields', 'required'),
            errors: this.count('fields', 'errors')
        }
    }

    status(){
        const stats = this.stats();
        const changed = stats.changed;
        const required = stats.required;
        const valid = stats.valid;
        const errors = stats.errors;
        if(this.debug) app.log(stats);
        let state = '';
        let savable = false;

        let stateText = '';
        if( required <= valid && errors === 0 && changed > 0 ){
            //Can Save
            savable = true;
        }else{

        }

        if( changed - errors > 0 ){
            state = 'unsaved';
            stateText = `<span class="txt-yellow bold">${changed - errors} Unsaved Changes</span>`;
        }else if( changed > 0 ){
            state = 'unsaved';
            
        }else{
            state = "saved";
            stateText = `Saved`;
        }

        if( errors > 0 ){
            state = 'errors';
            stateText += ` and <span class="error-text bold">${errors} Errors</span>`;
        }

        return {
            canSave: savable,
            state: state,
            message: stateText
        } 
    }

    update(){
       // this.debug = true;
        if(this.debug){
            
          //  app.log('FORM UPDATE');
           // app.log('VALID', this.#valid);
           // app.log('INVALID', this.#invalid);
          //  app.log('REQUIRED', this.#required);
           // app.log('CHANGED', this.changed);
        
        }

        if( Util.Array.contains( this.#valid, this.#required ) ){
            this.valid = true;
            this.emit('valid');
        }


        if( Util.Array.contains( this.#valid, this.#required )  && ( this.changed.length > 0 || this.noinput ) ){
            
            this.savable = true; 
            if(this.debug) app.log('SAVABLE', this.savable);
            this.emit('savable');
            
        }else{
            this.savable = false; 
            
        }
    }

    /**
     * 
     * @param type fields, or inputs
     * @param prop 
     * @returns 
     */
    count( type, prop ){
        let count = 0;
        for( let name in this[type] ){
           // console.log(type, prop);
            if( ( prop == 'errors' && this[type][name][prop].length > 0) || ( prop !== 'errors' && this[type][name][prop] == true ) ){
                count++;
            }
        }
        return count;
    }

    

    //If Form has Input by name
    has( name ){
        return this.inputs[name] ? true : false;
    }

    /**
     * @method input
     * @param name 
     * @returns Wrapped Input Instance
     */

    input( name ){
        return this.inputs[name];
    }

    //Get Form Data as Object
    data(){
        const data = {};
        for( let name in this.inputs ){
            data[name] = this.input(name).value;
        }
        return data;
    }

    //Fill Form Inputs from object
    fill( data ){
        for( let name in data ){
            if(this.has(name)) app.log('FILL', name, data[name]);
            if(this.has(name)) this.input(name).value = data[name];
        }
    }

    //Set Form Input Value
    set( name, value ){
        if(this.has(name)){
            this.input(name).value = value;
            this.input(name).changed = true;
        }
    }

    clear( name ){
        console.log('clear', name, this.inputs);
        if(name){
            if(this.has(name)){
                this.input(name).clear();
            }
        }else{
            for( let name in this.inputs ){
                this.inputs[name].clear();
            }   
        }
        this.update();
    }

    undo(){
        this.history.undo();
    }

    bindInput( el ){
        const isRadio = el.type == 'radio';
        let InputWrapper;
        
        
        InputWrapper = FormField.isField( el ) ? FormField : FormInput;
      
        const input = new InputWrapper( el, this );
        const name = el.name;

        input.on('changed', ( value, prev ) => {
            //app.log('Form Changed', name, value, this.values );
            this.changed.push(input.name);
            this.history.push( input, 'value', prev );
            this.values[name] = value;
            if(this.validator){
                this.validator.test(name, value);
            }
            this.emit('changed', input.name, value, prev );
            this.update();
        });

        input.on('input', ( value ) => {
            this.values[name] = value;
            if(this.validator){
                this.validator.test(name, value);
            }
            //app.log('Form Input', name, value, this.values);
            this.emit('input', input.name, value );
           
            this.update();
        });

        input.on('valid', () => {

            this.#invalid.remove(input.name);
            this.#valid.push(input.name);
            if( this.valid == false && this.#invalid.length == 0 ){
                this.valid = true;
            }
            this.update();

        });

        input.on('invalid', () => {
            
            this.#valid.remove(input.name);
            this.#invalid.push(input.name);
            if(this.valid){
                this.valid = false;
            }
            this.update();
        });

        input.on('errors', () => {
            this.state = 'error';
            this.update();
        });

        if( input instanceof FormField ){
            this.fields[input.name] = input;
        }


        
        this.inputs[input.name] = input;

        if(input.valid){
            this.#valid.push(input.name);
        }else{
            this.#invalid.push(input.name);
        }

        if(input.required){
            this.#required.push(input.name);
        }

        this.values[input.name] = input.value;

        el.classList.add('__bound');
        

        return input;
    }

    bind(){
        const elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
            if( elements[i].name && elements[i].name !== '' ){
                if(elements[i].name.charAt(0) == '_' || elements[i].classList.contains('_bound')) continue;
               this.bindInput(elements[i]);
            }
        }

        this.update();
        this.emit('bound');
    }

    hasHook( type, fn ){
        return this.#hooks[type] ? true : false;
    }

    hook( type, fn ){
        if(!this.hasHook(type)) this.#hooks[type] = [];
        this.#hooks[type].push(fn);
        return true;
    }

    runHook( type, data, e ){
        if(this.debug) app.log('Hook', type, data );
        if(!this.#hooks[type]) return;
        for(let i=0;i<this.#hooks[type].length;i++){
            data = this.#hooks[type][i]( data, e );
            if( data === false ){
                return false;
            }
        }
        return data;
    }


    submit(){
        return this.dom.submit();
    }

    saving(){


        this.disabled = true;

        if(this.submitButton.$.class.has('loader')){
            const ring = this.submitButton.$.first('loader-ring');
            ring.active = true;
        }

    }

    

    saved( field ){


        if(field){
            this.input(field).saved();
            this.changed.remove(field);
            this.default[field] = this.input(field).value;
        }else{
            this.history.reset();
            for( let name in this.inputs ){
                if(this.inputs[name].changed){
                    this.input(name).saved();
                }
            }
            this.changed = new DistinctArray();
            this.default = this.data();
            this.state = 'saved';
        }
        if(this.debug) app.log('Form Saved', this.changed, this.default, this.status() );
    }

    onSuccess( resp ){
        if(this.debug) app.log( 'Form Success', resp );

        if(this.submitButton.$.class.has('loader')){
            const ring = this.submitButton.$.first('loader-ring');
            ring.complete = true;
        }

        this.history.reset();
        for( let name in this.inputs ){
            if(this.inputs[name].changed){
                this.input(name).saved();
            }
        }

        this.changed = new DistinctArray();
        this.default = this.data();
        this.state = 'saved';
        this.emit('saved', resp );
        this.update();

        this.emit( 'response', resp );
        this.emit( 'success', resp );
    }

    flash(text, type="info"){
        const flashContainer = this.dom.getAttribute('flasher') || this.dom.id;
        app.flash.use( flashContainer ).message({ type: type, content: text });
    }

    message(text, type="info"){
        const formMessageContainer = this.dom.querySelector('.form-message');
        if(formMessageContainer){
            const messageText = formMessageContainer.querySelector('.text');
            formMessageContainer.className = `form-message ${type}`;
            messageText.innerText = text;
            setTimeout(() => {
                formMessageContainer.className = `form-message`;
            }, 10000 );
        }
    }

    onErrors( resp ){
        if(this.debug) app.log( 'Form Error', resp );
        if(this.submitButton ){

            if(!this.submitButton.hasAttribute('disabled'))
                this.submitButton.setAttribute('disabled', '');

            if(this.submitButton.$.class.has('loader')){
                const ring = this.submitButton.$.first('loader-ring');
                ring.failed = true;
            }
        }

        this.emit('response', resp );
        this.emit('error', resp );

        return this.setErrors( resp );

    }

    setErrors({ message, flash, errors }){
        if(!message && !flash && !errors){
            if(typeof arguments[0] == 'string'){
                message = arguments[0];
            }else if(typeof arguments[0] == 'object'){
                errors = arguments[0];
            }
        }
        if(this.debug) console.trace(message, flash, errors);

        if(!Util.empty(flash)){
            for(let i=0;i<flash.length;i++){
            this.flash( flash[i].message, flash[i].type );
            }
        } 

        if(message){
            this.message( message, 'error' );
        }

        for(let name in errors ){
            if(this.has(name))
            this.input( name ).onErrors(errors[name])
        }
    }   

    onSubmit( e ){
 
        const formData = this.data();
        if(this.debug) app.log(formData);
        let data = { ...formData };
        if(this.debug) app.log(data);



        if(this.hasHook('before-submit')){
            data = this.runHook('before-submit', data, e );
            if( data == false ){
                e.preventDefault();
                return false;
            }
        }

        const diff = Util.Object.diff( formData, data );
        if( diff ){
            for( let prop in diff ){
                if( this.has(prop) ){
                    this.input(prop).value = diff[prop];
                }
            }
        }

        return this.runHook('submit', data, e );

    }

    initialize(){


        
        this.bind();
        this.default = this.data();

        if(this.dom.querySelector('.form-info')){
            this.info = new FormInformation( this );
        }else if(this.dom.querySelector('form-info')){
            this.info = this.dom.querySelector('form-info');
            this.info.bindForm(this);
        }

        if( this.submitButton && !this.status().canSave ){
            if(!this.submitButton.hasAttribute('disabled'))
                this.submitButton.setAttribute('disabled', '');
        }

        if(this.submitButton){
            this.submitButton.parentNode.addEventListener('click', ( e ) => {
                if(this.submitButton.hasAttribute('disabled')){
                    this.setErrors('You cannot currently submit this form. Please ensure all required fields are completed and try again.');
                }
            });
        }
        
        

    

        this.dom.addEventListener('submit', ( e ) => {
            this.saving();
            return this.onSubmit( e );
        });

       //console.log('Form Initialized', this.dom, this.constructor.name );
    }

}


class Form extends FormBasic {

    static Presets = Presets

    validator;

    constructor( selector, scope ){
        super( selector, scope );
        if(this.constructor.name == 'Form') this.initialize();

        
    }

    collectRulesFromElements(){
        const rules = {};
        const elements = this.elements || [];

        for(let i=0;i<elements.length;i++){
            const el = elements[i];
            if(!el || !el.name || el.name === '') continue;

            const attrRule = (el.getAttribute && (el.getAttribute('validation') || el.getAttribute('validate'))) || '';
            let fieldRules = `${attrRule}`.trim();

            if(el.hasAttribute && el.hasAttribute('required')){
                if(fieldRules.length){
                    const tokens = fieldRules.split('|').map((token) => token.trim());
                    if(!tokens.includes('required')){
                        fieldRules = `required|${fieldRules}`;
                    }
                }else{
                    fieldRules = 'required';
                }
            }

            if(fieldRules.length){
                rules[el.name] = fieldRules;
            }
        }

        return rules;
    }

    initialize(){
        super.initialize();
        const rules = this.collectRulesFromElements();
        if(Object.keys(rules).length){
            this.rules(rules);
        }
    }

    rules(rules){

        if(this.validator) this.validator.removeAllListeners();
        this.validator = null;

       // console.trace('SET RULES',{ ...rules }, this.id, this.constructor.name);
        this.validator = Validator.make( rules, this.values, this );
        
        this.validator.on('property:invalid', (property) => {
            console.log('property:invalid', property);
            if( this.has(property) )
            this.input(property).valid = false;
            this.emit('property:invalid', property );
        });

        this.validator.on('property:valid', (property) => {
            console.log('property:valid', property);
            if( this.has(property) )
            this.input(property).valid = true;
            this.emit('property:valid', property );
        });

        this.validator.on('error', (property, error ) => {
            if( this.has(property) && this.input(property).onWarning) this.input(property).onWarning(error);
        });

        this.validator.on('resolve', (property, error ) => {

        })
    }

    formats( formatters ){
        for(let inputName in formatters ){
            this.setFormat( inputName, formatters[inputName] );
        }
    }

    setFormat( inputName, formatter ){
        if(this.debug) app.log('Form Set Format', inputName, formatter );
        if(this.has(inputName))
        this.input(inputName).setFormat(formatter);
    }

    setDefault(){
        for( let name in this.fields ){
            this.input(name).value = this.input(name).default;
        }   
    }

    sendAsXhr(){
        const action = this.action;
        const method = this.method.toLowerCase();

        const request = new Request( action );
        return request[method]( self.values, { accept: 'json' } );
    }

    onsave( callback ){
        this.hook('submit', ( data, e ) => {
            e.preventDefault();
            if(this.debug) app.log(data);
            this.emit('submit', data );
            return callback ? callback.apply( this, [data] ) : false;
        });
    }

    xhr(){
        const self = this;
        const action = this.action;
        const method = this.method.toLowerCase();
        return new Promise((resolve, reject)  => {
            self.dom.addEventListener("submit", (e) => {
                e.preventDefault();
                self.sendAsXhr().then(resolve).catch(reject);
                return false;
            });
        });
    }


    ajax(){
        this.hook('submit',( data, e ) => {
            e.preventDefault();
            const request = new Request( this.action );
            request[this.method.toLowerCase()]( data, { accept: 'json' } )
            .then((resp, code ) => {
                this.emit('response', resp, data );
            }).catch(( error ) => {
                this.onErrors( error );
            });
            return false;
        });
        return false;
    }

    beforeSubmit(fn){
        this.setHook('before-submit', fn);
    }

    onsubmit( callback ){

        this.hook('submit', ( data, e ) => {
            if(this.debug) app.log(data);
            this.emit('submit', data );
            return callback ? callback.apply( this, [data] ) : false;
        });
       
        //e.preventDefault();
        
    }

    intercept( callback ){
        this.hook('submit', ( data, e ) => {
            e.preventDefault();
            if(this.debug) app.log(data);
            this.emit('submit', data );
            return callback ? callback.apply( this, [this.values] ) : false;
        });
    }

    override( callback ){
        this.hook('submit', ( data, e ) => {
            e.preventDefault();
            if(this.debug) app.log(data);
            this.emit('submit', data );
            return callback ? callback.apply( this, [data] ) : false;
        });
    }

    busy( busy=true ){
        if(busy){
            this.dom.classList.add('busy');
        }else{
            this.dom.classList.remove('busy');
        }
    }

}

export default Form;
