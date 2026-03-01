
import CustomDom from '../core/Dom/Custom.mjs';
import BoundingRect from '../core/Dom/BoundingRect.mjs';
import setupCSS from '!../../sass/component--setup.scss?toString';
import infoBoxCSS from '!../../sass/component--infobox.scss?toString';
import VirtualDom from '../core/VirtualDom/VirtualDom.mjs'
import Util from '../core/Util/Core.mjs';
import { StyleProperties } from '../core/Style/Styles.mjs';

const CustomHTMLElement = CustomDom.HTMLElement;

class ListComponent extends CustomHTMLElement {

    static config = {
        shadow: true
    };

    static get observedAttributes() {
        return ['columns'];
    }

    static get style(){
        return [setupCSS];
    }

    static renderColumn( data ){
        function row( key ){
            return `
                <tr>
                    <td>${key}</td>
                    <td>${data[key]}</td>
                </tr>
            `;
        }
        return `
            <div class="column">
                <table cellspacing="0" >
                    ${Object.keys(data).map( row ).join("\n")}
                </table>
            </div>
        `;
    }

    static html(){
        return `
        <header>
            <slot name="title"></slot>
        </header>
        <main ref="main" class="flex-h" >
            ${this.data.map(renderColumn)}
        </main>
        <footer></footer>
        `;
    }
    data = [];

    addData( key, value, column=1 ){
        if(!this.data[column]) this.data[column] = {};
        this.data[column][key] = value;
    }

    onAttributeChanged( prop, old, value ){
        switch(prop){
            case 'columns':
               
            break;
        }
    }

}

customElements.define('info-list', ListComponent );


class InfoBoxComponent extends CustomDom.HTMLElement {

    static tag = 'ui-infobox';

    static config = {
        emitter: true,
        properties: {
            title: {
                type: 'string'
            },
            text: {
                type: 'string'
            },
            target: {
                type: 'dom'
            },
            header: {
                type: 'object'
            },
            body: {
                type: 'object'
            },
            actions: {
                type: 'object'
            }
        }
    }

    gap = 0;
    appliedStyles = {};

    static get observedProperties(){
        return ['title', 'text', 'header', 'body'];
    }

    static get observedAttributes(){
        return ['title', 'text'];
    }

    
    static get style(){
        return [infoBoxCSS];
    }

    static html( data ){

        const title = this.title;
        const text = this.text;
        

        return `
        <div class="bg">
            <div class="pointer" ref="pointer">
                <div class="block"></div>
                <m-icon ref="pointer-icon" title="Information" type="info" color="currentColor" size="15"></m-icon>
            </div>
        </div>
        <div class="info-box" ref="box">
            <div class="graphic">
                <m-icon title="Information" type="info" color="#FFF" size="20"></m-icon>
            </div>
            <header ref="header">
                <span ref="title"><slot name="title"></slot></span>
            </header>
            <main>
                <div>
                <slot></slot>
                </div>
            </main>
            <footer class="flex-h">
                
            </footer>
            
        </div>
        
        `;
    }

    align( width, major='top', minor='left' ){

        const trect = new BoundingRect( this.target );
        let x, y;
        width = width || trect.width;
        this.ref('box').style.maxWidth = `${width}px`;
        
        const rect = this.getBoundingClientRect();

        if( major == 'top' && trect.space.top < ( rect.height + this.gap ) ){
            major = 'bottom';
        }else if( major == 'bottom' && trect.space.bottom < ( rect.height + this.gap ) ){
            major = 'top';
        }else if( major == 'left' && trect.space.left < ( rect.width + this.gap ) ){
            major = 'right';
        }else if( major == 'right' && trect.space.right < ( rect.width + this.gap ) ){
            major = 'left';
        }

        switch( major ){
            case 'top':
                y = trect.pageTop - ( this.gap + rect.height );
            break;
            case 'bottom':
                y = trect.pageBottom + this.gap;
            break;
            case 'left':
                x = trect.left - ( this.gap + rect.width );
            break;
            case 'right':
                x = trect.right + this.gap;
            break;
        }

        switch( minor ){
            case 'top':
                y = trect.pageTop - 5;
            break;
            case 'bottom':
                y = trect.pageBottom - rect.height;
            break;
            case 'left':
                x = trect.left;
            break;
            case 'right':
                x = trect.right - rect.width;
            break;
            case 'center':
                y = trect.pageBottom - (rect.height/2);
            break;
        }

        this.ref('html').classList.add(`${major}-${minor}`)

        const style = `
            :host{
                top: ${y}px;
                left: ${x}px;
                max-width: ${width}px;
                transform: ${this.offset};
            }
        `;

        this.ref('box').removeAttribute('style');
        this.styles.replace(style, 'host' );

    }

    focus({ target, width, align='top left', type="default", style="default", styles={}, ...options }){
        
        const self = this;
        this.target = target;

        if(this.TO) clearTimeout(this.TO);

        if(Util.empty(styles)){
            styles = {
                header: {
                    background: '#FFF',
                    color: '#000',
                    'font-weight': 'bold',
                    padding: '5px 10px',
                    'border-radius': '5px',
                    'box-shadow': '0 0 5px rgba(0,0,0,0.5)'
                },
                body: {
                    background: '#FFF',
                    color: '#000',
                    padding: '5px 10px',
                    'border-radius': '5px',
                    'box-shadow': '0 0 5px rgba(0,0,0,0.5)'
                },
                pointer: {
                    background: '#FFF',
                    color: '#000',
                    'border-radius': '5px',
                    'box-shadow': '0 0 5px rgba(0,0,0,0.5)'
                }
            }
        }

        for( let refKey in this.appliedStyles ){
            this.ref(refKey).removeAttribute('style');
            delete this.appliedStyles[refKey]
        }

        if( !Util.empty(styles) ){
            if(styles.header.background && !( styles.pointer && styles.pointer.background ) ){
                if(!styles.pointer) styles.pointer = {}, 
                styles.pointer.background = styles.header.background;
            }
            for(let refKey in styles ){
                if(this.ref(refKey)){
                    this.appliedStyles[refKey] = new StyleProperties( styles.header ).asText(' ');
                    this.ref(refKey).style = this.appliedStyles[refKey];
                }
            }
        }

        if(options.offset){
            this.offset = `translate( ${options.offset.left}, ${options.offset.top} )`;
        }else{
            this.offset = `translate( 0, 0 )`;
        }

        this.ref('html').className = ['component--html', ...style.split(' ').map( s => `style-${s}`)].join(' ');
        this.ref('html').classList.add(`type-${type}`);
        this.ref('box').className = 'info-box';
        this.ref('pointer-icon').setAttribute('type', type);

        this.build(options);
        
        if( !this.querySelector('[slot="title"]') ) this.ref('box').classList.add('no-title');
        
        this.removeAttribute('hidden');
        const alignments = align.split(' ');

        this.align(...[width, ...alignments]);

        if(options.timeout){
            this.TO = setTimeout( () => {
                closeInfoBox();
            }, options.timeout);
        }


        function closeInfoBox(){
            self.hide();
            document.removeEventListener( 'mousedown', closeInfoBox );

        }
        
        document.addEventListener( 'mousedown', closeInfoBox, false );
        
    }


    hide(){
        this.setAttribute('hidden', '');
    }


    onReady(){
        this.addEventListener('mousedown', function(e){
            e.stopPropagation();
            e.preventDefault();
           return false;
       }, true );

    }

    build( options ){

        if(options.title){
            let vdom = VirtualDom.create({ tag: 'span', attrs: { slot: 'title' }, content: options.title });
            this.appendChild(vdom);
        }

        if(options.text){
            let vdom = VirtualDom.parseHTML( options.text );
            app.log(vdom,  options.text);
            const text = VirtualDom.create( vdom );
            this.appendChild(text);
        }

        if(options.body){
            let vdom = VirtualDom.parse( options.body );
            app.log(vdom);
            const body = VirtualDom.create( vdom );
            this.appendChild(body);
        }
    
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'title':
                this.build( 'header', { tag: 'h3', text: value } );
            break;
            case 'text':
                if(typeof value == 'string'){
                    value = [{ tag: 'div', text: value }];
                }
                this.build( 'body', value );
            break;
            case 'header':
            break;
            case 'body':
            break;
            case 'actions':
            break;
        }
    }

}

customElements.define(InfoBoxComponent.tag, InfoBoxComponent );


class HelpBubbleComponent extends CustomDom.HTMLElement {

    static tag = 'm-help';



    static config = {
        properties: {
            size: { type: 'number', default: 20 }
        }
    };

    static get observed(){
        return {
            attributes: ['size'],
            properties: ['size']
        }
    }

    static html(){
        return `
        <a ref="btn" >
        <span>?</span>
        <div class="infobox hidden">
            <span ref="title"><slot name="title"></slot></span>
            <span ref="text"><slot name="text"></slot></span>
            <span></span>
        </div>
        </a>
        `;
    }

    static get style(){
        return [{
            ':host': {
                display: 'inline-block'
            },
            'a': {
                cursor: 'pointer',
                display: 'block',
                borderRadius: `15px`,
                background:'var(--color-lt-grey)',  
                color: '#007bc7',
                background:'var(--color-lt-grey)',  
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '20px'
            },
            'a:hover': {
                background: '#007bc7',
                color: '#FFF',
            },
            '.hidden': {
                display: 'none'
            },
            ':host([dark]) a': {
                background:'var(--color-blue)',
                color: 'var(--color-white)'
            }

        }];
    }

    onReady(){

        this.styles.add({
            'a': {
                width: `${this.size}px`,
                height: `${this.size}px`,
                borderRadius: `${this.size/2}px`,
                lineHeight: `${this.size}px`,
                fontSize: `${this.size*0.66}px`,
            }
        }, 'size');

        function closeInfoBox(){
            app.infoBox(null);
            document.removeEventListener('mousedown', closeInfoBox );
            window.removeEventListener('scroll', closeInfoBox );
        }

        this.ref('btn').addEventListener('click', () => {

            const titleEl = this.querySelector('[slot="title"]');
            const textEl = this.querySelector('[slot="text"]');

            app.infoBox( this, { 
                type:  'help', 
                style: '',
                styles: {
                    header: {
                        color: '#FFF'
                    }
                },
                width: 400,
                title: titleEl && titleEl.innerText || '',
                text: '<div>' + (textEl && textEl.innerHTML || '')+'</div>',
                align: 'right top'
            });

            document.addEventListener('mousedown', closeInfoBox, false);

            window.addEventListener('scroll', closeInfoBox, false);
        });

    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'title':
            break;
            case 'size':
            this.styles.replace({
                'a': {
                    width: `${value}px`,
                    height: `${value}px`,
                    borderRadius: `${value/2}px`,
                    lineHeight: `${value}px`,
                    fontSize: `${value*0.7}px`,
                }
            }, 'size');
            break;
        }
    }
}

customElements.define(HelpBubbleComponent.tag, HelpBubbleComponent );

class ColorKeyComponent extends CustomDom.HTMLElement {

    static tag = 'color-key';

    static config = {
        properties: {
            color: {
                type: 'string',
                linked: true
            }
        }
    } 

    static get observedProperties(){
        return ['color', 'size'];
    }

    static get observedAttributes(){
        return ['color', 'size'];
    }

    colors = {
        lt_gray:'#F2F2F3',
        mid_gray: '#C8CDD0',
        dark_gray: '#415058',
        black: '#1F292E',
        blue: '#007bc7',
        red: '#D41111',
        green: '#73C322',
        white: '#FFFFFF',
        yellow: '#FFAB1A',

    };

    static html(){
        const color = this.colors[this.color];
        return `
            <div class="pad">
                
            </div>
            <div class="hidden">
                <slot name="title"></slot>
                <slot name="body"></slot>
            </div>
        `;
    }

    static get style(){
        return [{
            ':host': {
                display: 'block',
                position:'relative'
            },
            '.pad': {
                cursor: 'pointer'
            },
            '.hidden': {
               display:'none' 
            }
        }];
    }

    onReady(){
        
        this.styles.replace({
            ':host': {
                width: this.size+'px',
                height: this.size+'px'
            },
            '.pad': {
                position:'relative',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                display:'block',
                background: this.colors[this.color]
            }
        }, 'main');

        function closeInfoBox(){
            app.infoBox(null);
            document.removeEventListener('mousedown', closeInfoBox );
            window.removeEventListener('scroll', closeInfoBox );
        }

        this.addEventListener('mouseover', () => {

            const titleEl = this.querySelector('[slot="title"]');
            const textEl = this.querySelector('[slot="body"]');

            app.infoBox( this, { 
                type:  'info', 
                style: '',
                styles: {
                    header: {
                        color: '#FFF',
                        background: this.colors[this.color]
                    }
                },
                width: 250,
                title: titleEl && titleEl.innerText || '',
                text: textEl && textEl.innerText || '',
                align: 'right top',
                offset: {
                    top: '-10px',
                    left: '10px'
                }
            });

            this.addEventListener('mouseleave', closeInfoBox, false);

            window.addEventListener('scroll', closeInfoBox, false);
        });

        

    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'color':

            break;
        }
    }
    
}


customElements.define(ColorKeyComponent.tag, ColorKeyComponent );

class ColorKeysComponent extends CustomDom.HTMLElement {

    static tag = 'color-keys';

    static config = {
        properties: {
            align: {
                type: 'string',
                default: 'vert',
                linked: true
            },
            size: {
                type: 'number',
                default: 10,
                linked: true
            }
        }
    } 

    static get observedProperties(){
        return ['align', 'size'];
    }

    static get observedAttributes(){
        return ['align', 'size'];
    }

    colors = {
        lt_gray:'#F2F2F3',
        mid_gray: '#C8CDD0',
        dark_gray: '#415058',
        black: '#1F292E',

        red: '#D41111',
        green: '#73C322',
        white: '#FFFFFF',
        yellow: '#FFAB1A',

    };


    static html(){
        return `
        <div class="color-keys" >
            <slot></slot>
        </div>
        `;
    }

    static get style(){
        return [{
            ':host': {
                display: 'inline-block'
            },
            '.color-key': {
                background: ''
            },
            'a:hover': {
                background: '#007bc7',
                color: '#FFF',
            },
            '.hidden': {
                display: 'none'
            },
            ':host([align="horz"])':{
                
            },
            '.pad': {
                position: 'relative',
            },
            '.pad:after': {
                content: `""`,
                display:'block',
                position: 'relative',
                width: '100%',
                paddingBottom: "100%"
            }
        }];
    }

    showColor( color ){

    }

    initKey(key){

        key.size = this.size - (this.size/2);
/*
        const color = key.getAttribute('color');
        const text = key.innerHTML;

        const touchPad = document.createElement('div');
        touchPad.className = 'pad';
        touchPad.style.backgroundColor = this.colors[color];
        touchPad.style.width = this.size+'px';

        const hidden = document.createElement('div');
        hidden.className = 'hidden';
        hidden.innerHTML = key.innerHTML;

        key.innerHTML = "";

        key.appendChild(touchPad);
        key.appendChild(hidden);

        key.addEventListener('mouseover', () => {

            const titleEl = this.querySelector('[slot="title"]');
            const textEl = this.querySelector('[slot="text"]');

            app.infoBox( this, { 
                type:  'help', 
                style: '',
                styles: {
                    header: {
                        color: '#FFF'
                    }
                },
                width: 400,
                title: titleEl && titleEl.innerText || '',
                text: textEl && textEl.innerText || '',
                align: 'right top'
            });

            document.addEventListener('mousedown', closeInfoBox, false);

            window.addEventListener('scroll', closeInfoBox, false);
        });

        */
    }

    onReady(){

        this.ref('html').style.width = this.size+'px';
       

        const keys = this.querySelectorAll('color-key');

        for(let i=0;i<keys.length;i++){
            this.initKey(keys[i]);
        }

        this.styles.replace({
            ':host': {
                width: this.align == 'horz' ? 'auto' : this.size+'px',
                height: this.align == 'horz' ?  this.size+'px' : 'auto',
                borderRadius: (this.size/2)+'px',
                padding: (this.size/4)+'px'
            },
            '::slotted(color-key)': {
                position:'relative',
                display:'block',
                marginBottom: '5px !important',
            },
            '::slotted(color-key:last-child)': {
                marginBottom: '0px !important',
            }
        }, 'main');

    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'title':
            break;
        }
    }
}

customElements.define(ColorKeysComponent.tag, ColorKeysComponent );
