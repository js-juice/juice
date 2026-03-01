import CustomDom from '../core/Dom/Custom.mjs';
import setupCSS from '!../../sass/component--setup.scss?toString';
import notifyCSS from '!../../sass/component--notifications.scss?toString';

const { HTMLElement: CustomHTMLElement } = CustomDom;

class NotificationComponent extends CustomDom.HTMLElement {

    static tag = 'm-notification';


    static config = {
        properties: {
            uuid: { linked: true, type: 'uuid' },
            massage: { linked: true, type: 'string' },
            caption: { linked: true, type: 'string' },
            anchor: { linked: true, type: 'string', default: 'bottom right' }
        }
    }

    // Override in order to listen to attribute changes
    static get observedAttributes() {
        return ['data', 'type', 'caption', 'message'];
    }
    //Any properties listed will invoke onPropertyChanged callback
    static get observedProperties() {
        return ['data', 'type', 'caption', 'message'];
    }   

    static get style(){
        return [notifyCSS];
    }

    static html(){
        return `
           <a ref="close" class="close">X</a>
           <div class="caption">${this.caption}</div>
           <div class="message">${this.message}</div>
        `;
    }

    close(){

    }

    onReady(){
        this.ref('close').addEventListener('click', () => {
            this.close();
        });
    }

    onPropertyChanged( prop, old, value ){

        switch(prop){
            case 'data':
                this.caption = value.caption;
                this.message = value.message;
                this.render();
            break;
        }
    }

}

customElements.define(NotificationComponent.tag, NotificationComponent );

class NotificationsComponent extends CustomHTMLElement{

    static tag = 'm-notifications';

    onReady(){

    }

    onNotification(){
        /*if you want to beep without using a wave file*/
        var context = new AudioContext();
        var oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = 800;
        oscillator.connect(context.destination);
        oscillator.start(); 
        // Beep for 500 milliseconds
        setTimeout(function () {
            oscillator.stop();
        }, 100); 
    }


}

customElements.define(NotificationsComponent.tag, NotificationsComponent );



class RealTimeNotificationComponent extends CustomDom.HTMLElement {

    static tag = 'notification-realtime';

    removed = false;
    animation;


    static config = {
        properties: {
            uuid: { linked: true, type: 'uuid' },
            massage: { linked: true, type: 'string' },
            caption: { linked: true, type: 'string' },
            duration: { linked: true, type: 'number' },
            state: { linked: true, type: 'string' }
        }
    }

    // Override in order to listen to attribute changes
    static get observedAttributes() {
        return ['type', 'caption', 'message', 'time', 'state', 'duration'];
    }
    //Any properties listed will invoke onPropertyChanged callback
    static get observedProperties() {
        return ['type', 'caption', 'message', 'time', 'state', 'duration'];
    }   

    static get style(){
        return [setupCSS, notifyCSS];
    }

    static html(){
        const self = this;

        const ring = (type) =>  {
            return `<div class="type ${type} ring ${this.icon?'has-icon ':''} flex-static">
            <m-ring ref="ring" size="${this.icon? '20':'40'}" animate animation-duration="${self.duration*1000 || 5000 }" complete="0"></m-ring>
        </div>`;
        }

        const icon = (icon) =>  {
            return `<div class="icon flex-static" ref="icon">
                ${icon}
            </div>`;
        }
        

        return `
        <div ref="card" class="card">
            <div class="flex-h">
                ${ !this.manual ? ring(this.type) : '' }
                ${ this.icon ? icon(this.icon) : '' }
                <div class="message">
                    <a ref="close" class="close">X</a>
                    <div class="caption">${this.caption} <span ref="status" class="status"></span></div>
                    <div class="message">${this.message}</div>
                </div>
           </div>
           ${this.progress && this.progress == 'bar' ? `<loader-bar height="5" ></loader-bar>` : `` }
        </div>
        `;
    }

    set status( status ){

        if( Date.now() - this.created < 2000 ){
            return setTimeout(() => {
                this.status = status;
            }, 2000 - (Date.now() - this.created));
        }

        this._status = status;

        switch(status){
            case 'success':
                this.ref('status').innerText = 'Success';
                this.close(2000);
            break;
            case 'fail':
                this.ref('status').innerText = 'Failed';
                this.close(2000);
            break;
            case 'pending':
            break;
        }

        this.ref('card').className = 'card';
        this.ref('card').classList.add('status-'+status);

    }

    get status(){
        return this._status;
    }

    success(){
        this.status = 'success';
    }

    fail(){
        this.status = 'fail';
    }

    close( timeout=0 ){
        setTimeout(() => {
            this.state = 'out';
        }, timeout);
        
    }

    onReady(){

        this.addEventListener('transitionend', function(){
            if(this.state == 'out' && !this.removed){
             //   app.log(this.state);
                document.querySelector('notifications-flash').removeChild(this);
                this.removed = true;
            }
        });

        this.ref('close').addEventListener('click', () => {
            this.close();
        });


        if(this.ref('ring')){

            this.ref('ring').addEventListener('animation-complete', () => {
                this.close();
            });

        };

        if(this.ref('icon')){
            if(this.ref('icon') && this.ref('icon').querySelector('m-animation') ){
                this.animation = this.ref('icon').querySelector('m-animation');
            }
        }

        setTimeout(() => {
            this.state = 'in';
            if(this.ref('ring')) this.ref('ring').complete = 1;
            this.created = Date.now();
            if(this.timeout){
                this.close(this.timeout);
            }
        }, 200 );
    }

    onPropertyChanged( prop, old, value ){
       // app.log('onPropertyChange',prop, value, old);
        switch(prop){
            case 'state':
                if(value == 'in'){
                    if(this.animation){
                        this.animation.start();
                    }
                }
            break;
            case 'type':
                if( value ){
                this.ref('html').classList.add('has-type');
                }
            break;
           
        }
        this.render();
    }

}

customElements.define(RealTimeNotificationComponent.tag, RealTimeNotificationComponent );

/*********************************************************************************
 * NOTIFICATION FLASHER DISPLAYS NOTIFY BOXES TIPICALLY IN BOTTOM LEFT OF SCREEN *
 *********************************************************************************/

class NotificationsFlasherComponent extends CustomHTMLElement {

    static tag = 'notifications-flash';
    count = 0;
    static config = {
        properties: {
            anchor: { linked: true, type: 'string', default: 'bottom right' }
        }
    }

    // Override in order to listen to attribute changes
    static get observedAttributes() {
        return ['anchor'];
    }
    //Any properties listed will invoke onPropertyChanged callback
    static get observedProperties() {
        return ['anchor'];
    }   

    static get style(){
        return [setupCSS, notifyCSS];
    }

    static html(){
        return `
            <slot ref="slot"></slot>
        `;
    }

    chime(){

        let src = 'https://storage.googleapis.com/maldelo/internal/sounds/notification-tone.mp3';
        let audio = new Audio(src);
        audio.play();

    }

    error(){

        let src = '/audio/error.mp3';
        let audio = new Audio(src);
        audio.play();

    }

    add( rtm ){
        
        if( rtm.audio == 'chime' ){
            this.chime();
        }else if( rtm.audio == 'error' ){
            this.error();
        }
        this.appendChild(rtm);
        return rtm;
    }

    setPosition(){
        const alignments = this.anchor.split(' ');
        const align = {};
        align[':host'] = { position: 'absolute' };

        if(this.count == 0){
            align[':host']['display'] = 'none';
        }

        for( let alignment of alignments ){
            align[':host'][alignment] = 0;
        }
        this.styles.replace(align, 'anchor' );
    }

    onReady(){

        const self = this;

        if(!this.hasAttribute('anchor'))  this.anchor = 'right bottom';

        this.ref('slot').addEventListener('slotchange', () => {
            let nodes = this.ref('slot').assignedElements();
            this.count = nodes.length;
            this.setPosition();
            this.dispatchEvent(new CustomEvent('itemchange', { detail: nodes.length }));
        });

        this.setPosition();

       
    }


}

customElements.define(NotificationsFlasherComponent.tag, NotificationsFlasherComponent );

