import CustomDom from '../core/Dom/Custom.mjs';
import setupCSS from '!../../sass/component--setup.scss?toString';
const { HTMLElement: CustomHTMLElement } = CustomDom;

import Color from '../color.mjs';
import Timeline from '../core/Animate/Timeline.mjs';
import Ease from '../core/Animate/Ease.mjs';
import { AnimationRotation } from '../core/Animate/Properties.mjs';


class RingGraphicComponent extends CustomHTMLElement {

    speed = 1;
    completed = 0;

    static config = {
        properties: {
            size: { linked: true, type: 'int', default: 40 },
            color: { linked: true, type: 'string', default: 'currentColor' },
            stroke: { linked: true, type: 'int', default: 5 },
            complete: { linked: true, type: 'number', default: 0 },
            completed: { type: 'number', default: 0 },
            offset: { linked: true, type: 'number', default: 0 },
            'bg-color': { linked: true, default: '#d2d2d2' }
        }
    }

    // Override in order to listen to attribute changes
    static get observedAttributes() {
        return ['size', 'color', 'stroke', 'bg-color', 'complete', 'offset', 'spin'];
    }
    //Any properties listed will invoke onPropertyChanged callback
    static get observedProperties() {
        return ['size', 'color', 'stroke', 'bg-color', 'complete', 'offset'];
    }

    static get style(){
        return [setupCSS, {
            ':host': {
                position: 'relative',
                width:'40px',
                height:'40px'
            },
            '.component--html': {
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                transition: 'color 0.4s ease'
            },
            '.wrapper': {
                position: 'absolute',
                width: '100%',
                height: '100%',
                transformOrigin: 'center center',
                transform: 'rotate(0deg)',
                zIndex:10
            },
            'svg': {
                position: 'absolute',
                width: '100%',
                height: '100%',
                transformOrigin: 'center center',
                display: 'block',
                transform: 'rotate(0deg)',
                zIndex:10,
                top: 0,
                left: 0
            },
            'svg.bg': {
                zIndex: 0,
                opacity:0.25
            },
            'slot': {
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0
            },
            'svg circle': {
                transition: 'stroke 0.5s ease'
            }
        }];
    }

    get dashOffset(){
        return ( this.strokeLength - ( this.strokeLength * this.completed ) );
    }


    static html(){
        return `
        <div ref="wrapper" class="wrapper">
        <svg class="bg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle ref="bg" cx="50" cy="50" r="${50-this.stroke}" fill="none" stroke="${ this['bg-color'] || '#d2d2d2' }" stroke-width="${this.stroke*2 || 10}"  />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle ref="circle" cx="50" cy="50" r="${50-this.stroke}" fill="none" stroke="currentColor" stroke-width="${this.stroke*2 || 10}" stroke-dasharray="${ this.strokeLength }" stroke-dashoffset="${ this.dashOffset }" />
        </svg>
        </div>
        <slot></slot>
        
        `;
    }

    get strokeLength(){
        return 313.6517333984375 - ( this.stroke * 6.27294921875 );
    }

    animateTo( target ){

        const start = this.completed;
        const end = target;

        const dist = end - start;

        Ease.animate('easeIn', { complete: this.completed }, { complete: target }, 1 ).tick(( values ) => {

        }).run();

    }

    spin(){

        const self = this;

        if(this.spinning) return false;
        this.color = this.defaultColor;

        self.setAttribute('animation-duration', 1000);

        this.spinning = true;
        this.complete = 0.5;

        const rotation = new AnimationRotation({
            //Max Degrees Per Second
            dps: 360,
            acceleration: 0.01
        });

        //Speed 1 = rotations per sec
        const wrapper = this.ref('wrapper');

        const tl = new Timeline();

        rotation.force(2);

        let stopping = false;

        tl.update = function( time ){
            rotation.update( time );
           // console.log(rotation.speed);
            if( rotation.speed === 0 ){
                tl.active = false;
                self.setAttribute('animation-duration', 500);
                self.reset();
                self.dispatchEvent(new Event('stopped'));
            }
            if(!self.spinning && rotation.speed > 350 ){
                self.complete = 1;
                rotation.force(0);
            }
            if( !self.spinning && !stopping && rotation.speed > 0 ){
                stopping = true;
                rotation.friction(0.35);
            }
        }

        tl.render = function(time){
            wrapper.style.transform = `rotate(${ rotation.deg }deg)`;
        }

        tl.complete = function(){
          //  console.log('Timeline Complete');
        }

    }

    stop( state = 'success', callback=function(){} ){
        const self = this;
        this.setAttribute('animation-duration', 1000);
        this.complete = 1;
        this.spinning = false;
        const startColor = this.color;
        if(state == 'success'){
            this.color = Color.green;
        }else if(state == 'error'){
            this.color = Color.red;
        }
       

        function sendCallback(){
            self.reset();
            callback();
        }

        this.addEventListener('stopped', sendCallback, false );
    }


    resize( w, h ){
        //app.log(w, h);
    }

    onReady(){
       // this.completed = this.complete;

        this.defaultColor = this.color;
        if(this.hasAttribute('spin')){
            this.spin();
        }
    
    }

    reset(){
        if(!this.hasAttribute('no-reset')){
        this.color = this.defaultColor;
        this.complete = 0;
        }
    }

    get animationDuration(){
        return this.hasAttribute('animation-duration') ? this.getAttribute('animation-duration') : 1000;
    }

    onAttributeChanged( prop, old, value ){
        switch(prop){
            case 'spin':
                this._spin = value;
                if(!this.ready) return;
                if(value){
                    if(!this.spinning) this.spin();
                }else{
                    if(this.spinning) this.stop();
                }
            break;
            case 'bg-color':
                this.bgColor = value;
            break;
        }
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'color':
                this.ref('html').style.color = value;
            break;
            case 'size':
                this.styles.replace({
                    ':host': {
                        width: `${value}px`,
                        height: `${value}px`
                    },
                    '.component--html': {
                        width: `${value}px`,
                        height: `${value}px`
                    }
                });
            break;
            case 'stroke':
                this.render();
            break;
            case 'complete':

            if(this.hasAttribute('animate')){
                    if(this.animation) this.animation.cancel();
                    //if(value === true) value = 1;
                    this.render();
                    this.animation = Ease.animate('easeOut', { complete:  this.completed }, { complete: value }, this.animationDuration ).tick(( values ) => {
                        this.completed = values.complete;
                       // this.render();
                       this.ref('circle').setAttribute('stroke-dashoffset', this.dashOffset );
                        if(this.completed >= 1 ){
                            this.dispatchEvent(new Event('complete'));
                        }
                    })
                    this.animation.run().then(() => {
                        this.dispatchEvent(new Event('animation-complete'));
                    });
                }else{
                    this.completed = value;
                    this.render();
                }
            break;
           
            
        }
    }

}

customElements.define('m-ring', RingGraphicComponent );