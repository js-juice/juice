import CustomDom from '../core/Dom/Custom.mjs';
const { HTMLElement: CustomHTMLElement } = CustomDom;
import css3d from  '!../../sass/component--3d.scss?toString';

import ComponentHelper from './Helper.mjs';

class CylinderComponent extends CustomHTMLElement {


    static tag = 'shape-cylinder';

    faces = 50;

    perspective = .2;

    static config = {
        //debug: true,
        properties: {
            width: { linked: true },
            height: { linked: true },
            rx: { linked: true },
            color: { linked: true, default: '#d2d2d2' },
        }
    }

    // Override in order to listen to attribute changes
    static get observedAttributes() {
        return [ 'width', 'height', 'color', 'rx' ];
    }
    //Any properties listed will invoke onPropertyChanged callback
    static get observedProperties() {
        return ['width', 'height', 'color', 'rx'];
    }

    static get style(){
        return [{
            '.component--html': {
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                transformStyle: 'preserve-3d',
                transform: 'rotateX(-25deg)',
                position: 'relative'
            },   
            '.end':{
                width: '100%',
                position: 'absolute',
                backgroundColor: '#d2d2d2',
                transform: `rotateX(90deg) translate(-50%,-50%)`,
                transformOrigin: 'top center',
                borderRadius: '50%',
                zIndex: 20,
                overflow: 'hidden',
                
                background: 'rgb(230,230,230)',
                background: 'radial-gradient(circle, rgba(230,230,230,0.6) 30%, rgba(87,87,87,0.6) 180%)'
            },
            '.end:before':{
                content: `""`,
                display: 'block',
                width: '100%',
                height: '100%',
                background: '#000',
                opacity:0.05
            },
            '.end:after':{
                content: `""`,
                display: 'block',
                width: '100%',
                paddingBottom: '100%',
                backgroundColor: this.color,
            },
            '.end-anchor': {
                position: 'absolute',
                transformStyle: 'preserve-3d',
                height: 0,
                width: 0,
                left: '50%',
                top:0
            },
            '.faces': {
                position: 'absolute',
                transformStyle: 'preserve-3d',
                height: '100%',
                left: '50%',
                transform: 'translate3d(-100%, 0, 0)',
            },
            '.face': {
                position: 'absolute',
                backgroundColor: this.color,
                opacity: 1,
                height: '100%',
                top: '0%',
                left: '0',
                transformOrigin: 'center center'
            },
            '.cylinder':{
                position: 'relative',
                transformStyle: 'preserve-3d'
            },
        }];
    }

    static html(){
        const type = this.animation;

        let faceHTML = "";
        for(let i=0;i<this.faces;i++){
            faceHTML += `<div class="face" style="--index: ${i};"></div>`;
        }

        return `
            <div class="cylinder" ref="cylinder" >
                <div class="end-anchor">
                    <div class="end"></div>
                </div>
                <div class="faces">
                ${faceHTML}
                </div>
            
            </div>
        `;
    }

    updateSize(){


        const cylinderW = this.width * ( Math.PI/2 );
        const faceW = (cylinderW/this.faces)*4;
        const faceDeg = 360 / this.faces;
        const faceShift = this.width / 2;

        const radiusY = this.width*this.perspective;;
        const radiusX = this.width/2;


        this.styles.replace({
            ':host': {
                width: `${this.width}px`,
                height: `${this.height}px`
            },
            '.component--html': {
                width: `${this.width}px`,
                height: `${this.height}px`,
                transform: `rotateX(${this.rx})`
            },
            '.cylinder': {
                height: `${this.height}px`,
                width: `${this.width}px`
            },
            '.end': {
                width: `${this.width}px`,
                height: `${this.width}px`,
                backgroundColor: this.color
            },
            '.faces': {
                
                width: 0
            },
            '.face': {
                left: `-${faceW/2}px`,
                width: `${faceW}px`,
                transform: `rotateY(calc(${faceDeg}deg * var(--index))) 
                translateZ( calc(${faceShift}px) )`,
                backgroundColor: this.color
            }
        });
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'color':
                this.updateSize();
            break;
            case 'width':
                this.updateSize();
            break;
            case 'height':
                this.updateSize();
            break;
        }
        this.render();
    }

    onReady(){

    }

}

customElements.define( CylinderComponent.tag, CylinderComponent );


class CubeComponent extends CustomHTMLElement {

    static tag = 'shape-cube';


    static config = {
        debug: true,
        properties: {
            width: { linked: true },
            height: { linked: true },
            color: { linked: true, default: '#d2d2d2' },
        }
    }


    static get observed() {
        return {
            properties: [ 'width', 'height', 'color' ],
            attributes: [ 'width', 'height', 'color' ]
        }
    }

    static get style(){
        return [ css3d, {
            '.component--html': {
                
            },
            '.cube': {
                width: '100%',
                height: '100%',
            },
            '.anchor': {
                height: '5px',
                width: '5px',
                borderRadius: '50%',
                border: '1px solid #000',
                transform: 'translate(-3px, -3px)'
            },
            '.anchor:before': {
                content: '""',
                display: 'block',
                width: '1px',
                height: '40px',
                background: '#000',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            },
            '.anchor:after': {
                content: '""',
                display: 'block',
                width: '40px',
                height: '1px',
                background: '#000',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }
        }]; 
    }

    static html(){
        return `
        <div class="anchor" ref="anchor"></div>
        <div class="cube" ref="cube">
            <div class="front">front</div>
            <div class="back">back</div>
            <div class="top">top</div>
            <div class="bottom">bottom</div>
            <div class="left">left</div>
            <div class="right">right</div>
        </div>
        `;
    }

    setDimentions = ComponentHelper.setDimentions.bind(this);

    onFirstConnect(){
        this.setDimentions({});
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case '':
            break;
        }
    }
}

customElements.define( CubeComponent.tag, CubeComponent );