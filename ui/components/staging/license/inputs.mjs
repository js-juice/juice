import Custom from "../../core/Dom/Custom.mjs";

class BorderInputs extends Custom.HTMLElement {

    static tag = 'input-border';

    inputTypes = {
        width: 'range',
        size: 'range',
        dash: 'range',
        gap: 'range'
    }

    borderStyles = {
        solid: {
            width: {
                min: 1,
                max: 20,
                default: 3,
                unit: 'px',
                step: 1
            }
        },
        dashed: {
            width: {
                min: 2,
                max: 30,
                default: 5,
                step: 0.1,
                unit: '%'
            },
            dash: {
                min: 1,
                max: 10,
                default: 10,
            },
            gap: {
                min: 1,
                max: 10,
                default: 5,
            }
        },
        dotted: {
            width: {
                min: 1,
                max: 10,
                default: 3
            },
            gap: {
                min: 10,
                max: 50,
                default: 15
            }
        },
        rope: {
            width: 40
        }
    }

    static config = {
        properties: {
            type: { type: 'string', default: 'solid' },
            label: { linked: true, type: 'string' },
            width: { type: 'number', default: 1 },
            length: { type: 'number', default: null  },
            gap: { type: 'number', default: null },
            color: { type: 'hex', default: '#000'},
            placement:  { type: 'string', default: 'outer' },
        }
    };

    static get observed(){
        return {
            attributes: ['label', 'placement'],
            properties: ['label', 'placement']
        }
    }

    static get style(){
        return [{
            '#border-style': {
                width: '240px'
            },
            '#border-style form-option': {
                paddingTop:'0.5rem'
            },
            '.row': {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
            },
            '.options': {
                width: '100%',
                background: '#FFF',
                border: '2px solid #999',
                borderRadius: '10px',
                marginLeft:'1rem',
                color: '#333',
                padding: '5px 10px',
                marginBottom: '1rem'
            },
            '.options .wrapper > *': {
                marginBottom: '0 !important'
            },
            '.wrapper': {
                width: '100%',
                paddingRight: '1rem'
            }
        }];
    }

    static html(){
        return `
        <div class="row">
            <div>
                <form-select id="border-style" ref="style" label="${this.label}" value="" >
                    <form-option value="" label="None"></form-option>
                    <form-option value="solid">
                        <div><span style="display:block;width:100%;border-bottom:2px solid #000;margin-bottom:5px;line-height:1.2" >Solid</span></div>
                    </form-option>
                    <form-option value="dashed">
                        <div><span style="display:block;width:100%;border-bottom:2px dashed #000;margin-bottom:5px;line-height:1.2">Dashed</span></div>
                    </form-option>
                    <form-option value="dotted" >
                        <div><span style="display:block;width:100%;border-bottom:2px dotted #000;margin-bottom:5px;line-height:1.2" >Dotted</span></div>
                    </form-option>
                    <form-option value="rope" >
                    <div><span style="display:block;width:100%;padding-bottom:15px;background:url(/img/seal-assets/rope-line.png) bottom left repeat-x ;margin-bottom:5px;line-height:1.2;color:rgba(0,0,0,1)" >Rope</span></div>
                    </form-option>
                </form-select>
            </div>
            <div class="options row" ref="options">

            </div>
        </div>
        `;
    }

    currentInputs = [];

    onStyleChange(){
        const self = this;
        this.ref('options').innerHTML = '';
        this.value = {};

        const type = this.ref('style').value;
        this.type = type;
        this.value.type = type;

        function onInputChange(e){
            const option = this.getAttribute('data-option');
            self.value[option] = Number(e.target.value);
            self.dispatchEvent(new CustomEvent('change'));
        }

        if(this.currentInputs.length){
            this.currentInputs.forEach(input => {
                input.removeEventListener('input', onInputChange);
            });
        }

        //Create Option Inputs from borderStyles object
        Object.keys(this.borderStyles[type]).forEach(option => {
            const inputType = this.inputTypes[option];
            const input = document.createElement(`form-${inputType}`);
            input.label = option;
            
            const props = this.borderStyles[type][option];
            switch(inputType){
                case 'range':
                    input.step = 0.01;
                    if(props.step){
                        input.step = props.step;
                    }
                    if(props.max){
                        props.min =  props.min || 0;
                        input.max = props.max;
                    }
                    if(props.unit){
                        input.unit = props.unit;
                    }
                break;
            }

            if(props.default){
                input.value = props.default;
                this.value[option] = props.default;
            }

            input.setAttribute('data-option', option );

            input.addEventListener('input', onInputChange);

            this.currentInputs.push(input);

            const wrapper = document.createElement('div');
            wrapper.classList.add('wrapper');
            wrapper.classList.add(inputType);
            wrapper.appendChild(input);
            this.ref('options').appendChild(wrapper);

            this.dispatchEvent(new CustomEvent('change'));
        });

        this.dispatchEvent(new CustomEvent('change'));
    }

    onReady(){
        this.ref('style').addEventListener('input', this.onStyleChange.bind(this));
    }
}

customElements.define( BorderInputs.tag, BorderInputs );



class TokenInputs extends Custom.HTMLElement {

    static tag = 'input-token';

    inputProperties = {
        token: {

        },
        anchor: {

        },
        pattern:{

        }
    }

    inputTypes = {
        token: 'select',
        anchor: 'dial',
        pattern: 'text'
    }

    static config = {
        properties: {
            token: { type: 'string', default: 'solid' },
            pattern: { type: 'string', default: '' },
            font: { type: 'number', default: null  },
            fontSize: { type: 'number', default: null }
        }
    };

    static get style(){
        return [{
            '#border-style': {
                width: '240px'
            },
            '#border-style form-option': {
                paddingTop:'0.5rem'
            },
            '.row': {
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
            },
            '.row > [input] + [input]': {
                paddingLeft: '1rem'
            },
            '.options': {
                width: '100%',
                background: '#FFF',
                border: '2px solid #999',
                borderRadius: '10px',
                marginLeft:'1rem',
                color: '#333',
                padding: '5px 10px'
            },
            '.wrapper': {
                width: '100%',
            }
        }];
    }

    static html(){
        return `
        <div class="row">
            <div input >
                <form-select id="token-key" name="token" ref="token" label="Token" value="" event="input::onInput(this)" input >
                    <form-option value="" label="Choose Token" default ></form-option>
                    <form-option value="name">
                        <span >Name</span>
                    </form-option>
                    <form-option value="state">
                        <span >State</span>
                    </form-option>
                    <form-option value="state:short">
                        <span >State (Short)</span>
                    </form-option>
                    <form-option value="license:number">
                        <span >License Number</span>
                    </form-option>
                    <form-option value="issued:short">
                        <span >Issued (Short)</span>
                    </form-option>
                    <form-option value="issued:med">
                        <span >Issued (Medium)</span>
                    </form-option>
                    <form-option value="expires:short">
                        <span >Expires (Short)</span>
                    </form-option>
                    <form-option value="expires:med">
                        <span >Expires (Medium)</span>
                    </form-option>
                </form-select>
            </div>
            <div input >
            <form-select name="size" ref="size" label="Font Size" value="12" event="input::onInput(this)" input >
                <form-option value="8" label="8" ></form-option>
                <form-option value="9" label="9"></form-option>
                <form-option value="10" label="10"></form-option>
                <form-option value="11" label="11"></form-option>
                <form-option value="12" label="12" default ></form-option>
            </form-select>
            </div>
            <div input >
                <form-dial name="anchor" min="0" max="360" step="1" unit="&deg;" value="100" input event="input::onInput(this)" ><form-dial>
            </div>
            <div input >
       
            <form-text input  name="pattern" value="" placeholder="Prefix[TOKEN]Suffix" event="input::onInput(this)" >
            <span slot="label">Token Pattern</span>
            </form-text>
            
        </div>
        `;
    }

    value = {};

    onInput(e, target){
        if(!this.value) this.value = {};
        debug( this.value, target.name,
        target.value );

        this.value[target.name] = target.value;
    }

    onTokenChange(){

        this.ref('options').innerHTML = '';
        this.options = {};

        const type = this.ref('style').value;
        this.type = type;

        //Create Option Inputs from borderStyles object
    
    }

    onReady(){
       // this.ref('style').addEventListener('input', this.onStyleChange.bind(this));
    }
}

customElements.define( TokenInputs.tag, TokenInputs );