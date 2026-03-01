import CustomDom from '../core/Dom/Custom.mjs';
import Timeline from '../core/Animate/Timeline.mjs';
import Color from '../core/Color/Color.mjs';
import BoundingRect from '../core/Dom/BoundingRect.mjs';
import gaugeCSS from '!../../sass/component--gauge.scss?toString';
import setupCSS from '!../../sass/setup.scss?toString';
import buttonsCSS from '!../../sass/form/form--buttons.scss?toString';

class CircleSectorComponent extends CustomDom.HTMLElement {

    static config = {
        properties: {
            deg: {
                linked: true,
                type: 'number'
            },
            color: {
                linked: true
            },
            percent: {
                linked: true,
                type: 'number'
            },
            width: {
                linked: true,
                type: 'number'
            },
            speed: {
                linked: true,
                type: 'number'
            },
            offset: {
                linked: true,
                type: 'string'
            }
        }
    };

    static get observedProperties(){
        return ['size', 'percent', 'offset', 'deg', 'color', 'width', 'speed'];
    }

    static get observedAttributes(){
        return ['size', 'percent', 'offset', 'deg', 'color', 'width', 'speed'];
    }

    static html(){
        return `
        <div class="wrapper" ref="wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle ref="circle" cx="50" cy="50" r="50" fill="none" stroke="#000000" stroke-width="100" />
            </svg>
        </div>
        `;
    }

    static get style(){
        return {
            '.component--html:after':{
                content: '""',
                position: 'relative',
                display: 'block',
                width: '100%',
                paddingBottom: '100%'
            },
            '.wrapper': {
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                transformOrigin: 'center center',
                transform: 'rotate(0)'
            },
            '.wrapper.animate circle': {
                transition: 'stroke-dashoffset 0.4s ease'
            }
        }
    }

    afterRender(){
        this.strokeLength = Math.ceil( this.ref('circle').getTotalLength() );
        this.ref('circle').setAttribute('stroke-dasharray', this.strokeLength );
    }

    onPropertyChanged( prop, old, value ){
       
        switch( prop ){
            case 'percent':
                this.strokeOffset = (1-(value/100))*this.strokeLength;
                this.ref('circle').setAttribute('stroke-dashoffset', this.strokeOffset );
            break;
            case 'offset':
                this.ref('wrapper').style.transform = `rotate(${value})`;
            break;
            case 'color':
                this.ref('circle').setAttribute('stroke', value);
            break;
            case 'deg':
                this.strokeOffset = (1-(value/360))*this.strokeLength;
                this.ref('circle').setAttribute('stroke-dashoffset', this.strokeOffset );
            break;
            case 'width':
                this.ref('circle').setAttribute('stroke-width', value );
            break;
            case 'speed':
                if(value > 0 ){
                    this.ref('wrapper').classList.add('animate');
                    this.ref('circle').style.transitionDuration = value+'s';
                }else{
                    this.ref('wrapper').classList.remove('animate');
                }
            break;
        }
    }

}

customElements.define('circle-sector', CircleSectorComponent );



class CircleGaugeComponent extends CustomDom.HTMLElement {

    categories = {};

    static config = {
        //debug: true,
        properties: {
            size: { linked: true },
            subject: { linked: true },
            expanded: { linked: true },
        }
    }

    static get observedAttributes(){
        return ['size', 'subject', 'expanded'];
    }

    static get observedProperties(){
        return ['size', 'subject', 'expanded'];
    }

    static html(){
        return `
            <div class="guage-wrapper" style="width:${this.size}px; height:${this.size}px" >
                <div class="gauge" >
                    <div class="top-cover">
                        <div class="expanded cover">
                            <div class="subject">${this.subject || ''}</div>
                            <div class="value">${ this.total ||  0 }</div>
                        </div>
                    </div>
                    <div class="content" ref="content"></div>
                    <div class="bg"></div>
                </div>
            </div>
            <div class="data vdom-noupdate" >
                <table cellspacing="0" cellpadding="0">
                <tbody ref="short-list"> </tbody>
                </table>
            </div>
        `;
    }

    static get style(){
        return [gaugeCSS];
    }

    set( cat, value, color ){
        //app.log('SET', cat, value, color );
        if(!this.categories[cat]){
            const dom = document.createElement('circle-sector');
            dom.color = color;
            this.ref('content').appendChild(dom);
            this.categories[cat] = { dom: dom };
        }
        if(color) this.categories[cat].color = color;
        if(value) this.categories[cat].value = value;
        this._render();

    }

    _render(){
        const data = [];
        const categories = this.categories;
        let total = 0;
        let count = 0;
        const shortList = this.ref('short-list');
        shortList.innerHTML = '';
        for( let cat in this.categories ){
            if(this.categories[cat].value > 0){
            total += this.categories[cat].value;
            count++;
            }
        }

        for( let cat in this.categories ){
            const category = this.categories[cat];
            if(category.value > 0){
                data.push({ 
                    category: cat, 
                    value: category.value,
                    percent: (category.value/total)*100,
                    color: category.color
                });
            }
        }

        if(data.length == 0 ) return;
              
        data.sort(function(a,b){
            return b.value - a.value;
        });

        let offset = 0;
        if(this.subject){
            const tr = document.createElement('tr');
            if( this.hasAttribute('expanded') ){
                tr.innerHTML = `<th colspan="2"><span class="not-expanded">${count} ${this.subject}</span></th>`;
            }else{
                tr.innerHTML = `<th colspan="2">${count} ${this.subject}</th>`;
            }
            shortList.appendChild(tr);
        }


        this.total = count;
        const shortListItems = [];
        let listCount = 0;
        function renderNext(){
            const item = data.shift();
            shortListItems.push(item);
           
            const { percent } = item;
            const { dom, category } = categories[item.category];
            dom.percent = percent;
            dom.offset = offset+'deg';
            offset += (percent/100)*360;
            listCount++;
            if(data.length) renderNext();
        }

        renderNext();

        for(let i=0;i<shortListItems.length;i++){
            let item;
            if( i > 3 ){
                item = {
                    color: '#d2d2d2',
                    category: (shortListItems.length-i)+' others',
                    percent: 0
                };
                for(let ii=i;ii<shortListItems.length;ii++){
                    item.percent += shortListItems[ii].percent;
                }
                i = shortListItems.length;
            }else{
                item = shortListItems[i];
            }
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><i style="background:${item.color}"></i><b>${item.category}</b></td><td>${item.percent.toFixed(1)}%</td>`;
            shortList.appendChild(tr);
        }

        this.render();
    }

    setSize(){
        const h = this.size;
        let w = h;
        const expanded = this.hasAttribute('expanded');
        if(expanded && this.getAttribute('expanded') !== 'null'){
            w = h*2;
        }
        this.styles.replace({
            ':host': {
                width: `${w}px`,
                height: `${h}px`
            },
            '.component--html': {
                width: `${w}px`,
                height: `${h}px`
            }
        }, 'host');
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'size':
                this.setSize();
            break;
            case 'expanded':
                this.setSize();
            break;
        }
    }

}

customElements.define('circle-gauge', CircleGaugeComponent );


class UICheckItemComponent extends CustomDom.HTMLElement {

    static get observedAttributes(){
        return ['checked'];
    }

    static get style(){
        return {
            ':host': {
                display: 'block',
                background: 'inherit'
            },
            '.wrapper':{
                display: 'block',
                width:'100%'
            },
            '.content':{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                margin: '0 auto',
                width: '100%'
            },
            '.icon': {
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                transition: 'border 0.4s ease'
            },
            '.label': {
                lineHeight: '25px',
                padding: '0 10px'
            },
            ':host([checked]) .icon':{
                boxSizing: 'border-box',
            }
        };
    }

    static html(){
        return `
        <div class="wrapper">
        <div class="content">
            <div class="icon">
            <field-status ref="field-status" size="25" state="error"></field-status>
            </div>
            <div class="label"><slot></slot></div>
        </div>
        </div>
        `;
    }
    
    get checked(){
        return this.hasAttribute('checked')
    }

    set checked( value ){
        if(value){
            this.setAttribute('checked', '');
            this.ref('field-status').state = 'success';
        }else{
            this.removeAttribute('checked');
            this.ref('field-status').state = 'error';
        }
    }

    onReady(){
        //const bgColor = window.getComputedStyle( this ,null);
        //app.log(bgColor);
        //new Color();
    }

    onAttributeChanged( prop, old, value ){
        switch(prop){
            case 'checked':
                app.log('checked', value );
            break;
        }
    }

}

customElements.define('ui-checkitem', UICheckItemComponent );

class UIChecklistComponent extends CustomDom.HTMLElement {

    static get style(){
        return {
            ':host': {
                display: 'block',
                background: 'inherit',
                width: '100%'
            },
            ':host([inline]) .wrapper': {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                margin: '0 auto',
                width: '100%'
            },
            '::slotted(ui-checkitem)': {
                flex: '1 0 auto'
            },
            '.wrapper': {
                display: 'block',
                width: '100%'
            }
        }
    }

    static html(){
        return `<div class="wrapper"><slot></slot></div>`;
    }

    onReady(){
        for(let i=0;i<this.children.length;i++){

        }
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'type':
            break;
        }
    }

}

customElements.define('ui-checklist', UIChecklistComponent );


class UISignitureComponent extends CustomDom.HTMLElement {

    static tag = 'ui-signiture';

    static config = {
        emitter: true,
        properties: {
            label: {
                linked: true,
                type: 'string'
            },
            size: {
                linked: true,
                type: 'number',
                default: 40
            },
            checked: {
                type: 'boolean',
                default: false
            }
        }
    };

    static get observedAttributes(){
        return ['label', 'size', 'dir'];
    }

    static get observedProperties(){
        return ['label', 'size', 'dir', 'checked'];
    }

    static get style(){

        const animations = `
            @keyframes pointMoveRTL {
                0% {
                    transform: translateX(0);
                }
                25% {
                    transform: translateX(10px);
                }
                50% {
                    transform: translateX(0);
                }
                100%{
                    transform: translateX(0);
                }
            }
            @keyframes pointMoveLTR {
                0% {
                    transform: translateX(0);
                }
                25% {
                    transform: translateX(-10px);
                }
                50% {
                    transform: translateX(0);
                }
                100%{
                    transform: translateX(0);
                }
            }
        `;

        return [setupCSS, animations, {
            '.sig-label': {
                
            },
            '.label': {
                background: '#FFAB1A',
                color: '#333',
                fontSize: '0.9rem',
                
                height: '100%',
                position: 'relative',
                padding: '10px 20px',
                zIndex: 10,
                animationFillMode: 'forwards',
                whiteSpace: 'nowrap'
            },
            '.checked .label': {
                background: '#99e151',
                color: '#333',
                animationIterationCount: 1
            },
            '.checked .label slot, .checked .label .default-label': {
                display:'none'
            },
            '.checked .label:before': {
                content: '"STAMPED AND SIGNED!"',
                fontSize: '20px',
                position:'relative',
                lineHeight: '30px',
                zIndex: 10,
                textTransform: 'uppercase'
            },
            '.default-label, slot': {
                display: 'none',
                zIndex: 10,
                position: 'relative'
            },
            '.custom-tag slot': {
                display: 'block'
            },
            '.default-tag .default-label': {
                display: 'block'
            },
            '.sig-checkbox': {
                position: 'relative',
            },
            '.sig-checkbox label': {
                display: 'block',
                position: 'relative',
                cursor: 'pointer',
                zIndex: 20,
                background: 'rgb(189, 189, 194)',
                borderRadius: '8px',
                transition: 'background 0.3s ease, border-radius 0.3s ease'
            },
            '.sig-checkbox label:after': {
                content: '""',
                display: 'block',
                position: 'relative',
                paddingBottom: '100%'
            },
            'status-icon': {
                position: 'absolute',
            },
            '.sig-checkbox input': {
                display: 'block',
                position: 'absolute',
                zIndex: 10,
                top:'10px',
                left:'10px'
            },
            '.checked .sig-checkbox label': {
                background: '#73C322',
                borderRadius: '50%'
            },
            '.pointer': {
                position:'absolute',
                background: 'inherit',
                zIndex: 0,
                transformOrigin: 'top right',
                transform: 'rotate(-45deg)',
                top: '-3px',
                borderRadius:'8px'
            },
            '.pointer:after': {
                content: '""',
                display: 'block',
                position: 'relative',
                paddingBottom: '100%'
            },
            '::slotted(*)': {
                lineHeight: '1',
                fontSize: '0.9rem'
            },
            '.ltr .pointer': {
                left: '0',
            },
            '.ltr.wrapper': {
                flexDirection: 'row-reverse'
            },
            '.ltr .label': {
                borderTopRightRadius: '5px',
                borderBottomRightRadius: '5px',
                marginLeft: '20px',
                animation: 'pointMoveLTR 1s infinite',
            },
            '.ltr .label .pointer': {
                transformOrigin: 'top left',
                transform: 'rotate(45deg)',
            },
            '.rtl .pointer': {
                right: '0',
            },
            '.rtl .label': {
                borderTopLeftRadius: '5px',
                borderBottomLeftRadius: '5px',
                marginRight: '20px',
                animation: 'pointMoveRTL 1s infinite',
            },
            '.sign-icon': {
                position: 'absolute',
                width: '90%',
                height: '90%',
                top:'5%',
                left: '5%'
            }
        }];
    }

    static html( data ){
        const diag = this.size;
        const pointSide = (diag*1.125) / Math.sqrt( 2 );
        return `
        <div class="wrapper flex-h ltr" ref="wrapper">
            <div class="sig-label">
                <div class="label" ref="label" >
                <div class="pointer" style="width:${pointSide}px"></div>
                <div class="default-label">Sign Here</div>
                <slot></slot>
                </div>
            </div>
            <div class="sig-checkbox" style="width:${this.size}px">
                <input ref="checkbox" id="sig-${this._index}" type="checkbox" />
                <label for="sig-${this._index}">
                <div class="sign-icon" ref="sign-icon">
                <svg version="1.1" fill="#000" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 50 50" enable-background="new 0 0 50 50" xml:space="preserve">
                <g>
                    <path d="M30.04,11.92c2.57,0.82,5.12,1.64,7.72,2.48c0.5-1.55,0.99-3.1,1.51-4.7c-2.04-0.65-4.07-1.3-6.12-1.96
                        c-0.2,0.61-0.39,1.19-0.59,1.82c-0.54-0.17-1.06-0.34-1.62-0.51c0.3-0.94,0.58-1.85,0.9-2.74c0.16-0.44,0.61-0.57,1.13-0.41
                        c2.09,0.67,4.19,1.34,6.28,2c0.41,0.13,0.83,0.26,1.24,0.4c0.6,0.2,0.81,0.6,0.61,1.21c-0.67,2.12-1.35,4.23-2.03,6.35
                        c-0.4,1.26-0.81,2.53-1.22,3.83c-0.54-0.17-1.06-0.34-1.62-0.52c0.33-1.05,0.66-2.08,1.01-3.17c-2.04-0.65-4.06-1.3-6.12-1.96
                        C28.9,21.05,26.68,28,24.45,35.01c2.04,0.65,4.05,1.3,6.12,1.96c1.55-4.85,3.09-9.7,4.64-14.57c0.55,0.17,1.06,0.34,1.6,0.51
                        c-0.03,0.12-0.05,0.22-0.08,0.32c-1.57,4.93-3.14,9.87-4.72,14.8c-0.1,0.3-0.3,0.61-0.54,0.82c-1.86,1.67-3.74,3.32-5.61,4.98
                        c-0.25,0.22-0.51,0.33-0.85,0.33c-5.31,0-10.61,0-15.92,0c-0.08,0-0.16-0.01-0.27-0.02c0-0.55,0-1.09,0-1.66
                        c5.07,0,10.13,0,15.25,0c-0.07-0.34-0.13-0.64-0.2-0.94c-0.43-1.88-0.86-3.76-1.28-5.65c-0.05-0.22-0.05-0.49,0.02-0.7
                        c2.43-7.64,4.86-15.27,7.3-22.91C29.95,12.17,29.99,12.06,30.04,11.92z M29.44,38.39c-1.66-0.53-3.25-1.04-4.9-1.56
                        c0.38,1.66,0.74,3.25,1.12,4.91C26.93,40.61,28.15,39.52,29.44,38.39z"/>
                </g>
                </svg>
                </div>
                <status-icon ref="icon" size="${this.size}" state="none"></status-icon>
                </label>
            </div>
        </div>
        `;
    }


    onReady(){
        let iterationCount = 0;
        if( this.children.length > 0 ){
            this.ref('html').classList.add('custom-tag');
        }else{
            this.ref('html').classList.add('default-tag');
        }

        this.ref('checkbox').addEventListener('click', () => {
            if( this.ref('checkbox').checked ){
                this.ref('html').classList.add('checked');
                this.setAttribute('checked', '');
                this.ref('sign-icon').style.display = 'none';
                this.ref('icon').setAttribute('color', '#FFFFFF');
                this.ref('icon').setAttribute('state', 'success');
                this.ref('label').style.animationIterationCount = iterationCount+1;
                this.emit('signed');
            }else{
                this.ref('html').classList.remove('checked');
                this.removeAttribute('checked');
                this.ref('icon').setAttribute('state', 'none');
                this.ref('sign-icon').style.display = 'block';
                this.ref('label').style.animationIterationCount = 'infinite';
                this.emit('unsigned');
            }
            this.checked = this.ref('checkbox').checked;
        }, false );

        if( this.hasAttribute('checked') ){
            this.ref('html').classList.add('checked');
            this.ref('checkbox').checked = true;
            this.ref('sign-icon').style.display = 'none';
            this.ref('icon').setAttribute('state', 'success');
            this.emit('signed');
        }

        this.ref('label').addEventListener('animationiteration', () => {
            iterationCount++;
        });

        this.checked = this.ref('checkbox').checked;
        
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'dir':
                if(value){
                this.ref('wrapper').classList.remove('rtl');
                this.ref('wrapper').classList.remove('ltr');
                this.ref('wrapper').classList.add(value);
                }
            break;
            case 'checked':
                if( value !== this.ref('checkbox').checked ){
                    this.ref('checkbox').click();
                }
            break;
        }
    }

}
customElements.define( UISignitureComponent.tag, UISignitureComponent );





export { CircleSectorComponent as default, CircleGaugeComponent, UIChecklistComponent }