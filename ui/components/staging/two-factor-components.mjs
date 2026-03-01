import CustomDom from '../core/Dom/Custom.mjs';
import Util from '../core/Util/Core.mjs';
import Api from '../maldelo/Api.mjs';
import setupCSS from '!../../sass/component--setup.scss?toString';
import Color from '../color.mjs';

const api = new Api();


class TwoFactorCard extends CustomDom.HTMLElement {

    values = [];

    static config = {
        emitter: true
    };

    static get style(){
        return {
            ':host': {
                display: 'block',
                background: '#FFF',
                maxWidth: '500px',
                padding: '1rem'
            },
            '*':{
                boxSizing: 'border-box'
            },
            '.card': {
                textAlign: 'center'
            },
            '.two-factor-code': {
                position: 'relative',
                width: '80%',
                margin: '0 auto',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'row',
                maxWidth: '600px'
            },
            '.loading':{
                display: 'none'
            },
            '.code-char': {
                flex: '0 1 auto'
            },
            'input': {
                width: '90%',
                textAlign: 'center',
                background: '#f3f3f3',
                display: 'inline-block',
                fontSize: '2rem',
                border: 0,
                borderRadius: '10px',
                padding: '0.5rem 0',
                border: '2px solid #f3f3f3'
            },
            'input:focus': {
                outline: 'none',
                border: '2px solid #bcec2c'
            },
            'p': {
                textAlign: 'center',
                margin: 0,
                fontSize: '0.8rem'
            },
            'two-factor-input': {
                margin: '10px auto'
            },
            ':host(.valid) .directions': {
                color: Color.green
            },
            ':host(.invalid) .directions': {
                color: Color.red
            }
        }
    }


    static html(){
        return `
            <div class="card" ref="card" >
                
                <slot></slot>
               
                <div class="two-factor-code flex-h" ref="code-wrapper" >
                    <div class="loading">
                        <m-icon type="loading" state="active" size="50" > </m-icon>
                    </div>
                    
                </div>
                <two-factor-input ref="inputs" auto-check ></two-factor-input>
                <p class="directions" ref="directions">Enter your 2FA code to continue.</p>
            </div>        
        `;
    }

    submit(){
        this.ref('card').classList.add('validating');
        this.querySelector('.envelope').classList.add('close');
        this.emit('code', this.ref('inputs').value);
    }

    bindInput( input, index ){

        const self = this;

        input.addEventListener('input', function(){
            if( /^[0-9]/.test(this.value) ){
                self.values[index] = this.value;
                if(self.inputs[index+1]) self.inputs[index+1].focus();
                else self.submit();
            }else{
                this.value = '';
            }
        }, false );

        input.addEventListener('focus', function(){
            for(let i=index;i<self.inputs.length;i++){
                self.inputs[i].value = '';
            }
        });
    }

    reset(){
        for(let i=0;i<this.inputs.length;i++){
            this.inputs[i].value = "";
        }
    }

    error(){
        this.ref('card').classList.add('error');
        this.reset();
    }

    focus(){
        this.ref('inputs').focus();
    }

    onReady(){
    
        this.ref('inputs').addEventListener('invalid', () => {
            this.classList.add('invalid');
            this.ref('directions').innerText = 'Invalid Code Please Try Again.';
        });

        this.ref('inputs').addEventListener('valid', () => {
            this.classList.add('valid');
            this.ref('directions').innerText = '2FA Valid.';
            this.submit();
        });

        this.ref('inputs').addEventListener('reset', () => {
            this.classList.remove('valid');
            this.classList.remove('invalid');
            this.ref('directions').innerText = 'Enter your 2FA code to continue.';
        });
    }

}

customElements.define('two-factor-card', TwoFactorCard );

class TwoFactorInput extends CustomDom.HTMLElement {

    static config = {
        emitter: true,
        shadow: true
    };

    values=[];

    static get style(){
        return [setupCSS, {
            ':host': {
                textAlign: 'center'
            },
            '.two-factor-input': {
                display: 'inline-block',
            },
            '.two-factor-number': {
                height: '55px',
                width: '45px',
                marginRight: '0.9rem'
            },
            '.two-factor-number:last-child': {
                marginRight: '0'
            },
            '.two-factor-number input': {
                height: '55px',
                width: '45px',
                lineHeight: '55px',
                background: '#FFFFFF',
                borderRadius: '5px',
                '-MozAppearance': 'textfield',
                fontSize: '40px',
                textAlign: 'center',
                border: '1px solid #d2d2d2',
                outline: 0,
                fontWeight: 'bold',
                transition: 'background 0.4s ease, color 0.4s ease'
            },
            '.two-factor-number input:empty': {
                background: '#f3f3f3',
            },
            '.two-factor-number input:not(:placeholder-shown)': {
                border: '1px solid #73C322'
            },
            '.two-factor-number input:focus': {
                border: '1px solid #007bc7',
                outline: 0,
                boxShadow: 'rgba(0, 123, 199, 0.2) 0px 2px 8px 0px'
            },
            'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button': {
                '-webkitAppearance': 'none',
                margin: 0
            },
            '.two-factor-progress': {
                paddingTop: '7.5px',
                overflow: 'hidden',
                height: '0px',
                transition: 'height 0.5s ease'
            },
            '.two-factor-progress m-ring': {
                margin: '0 auto'
            },
            '.checking .two-factor-progress': {
                display: 'block',
                height: '35px'
            },
            '.two-factor-input.error': {
                
            },
            '.two-factor-input.error': {
                animation: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both'
            },
            '.two-factor-input.error .two-factor-number input': {
                background: Color.red,
                color: Color.red
            }
        },
        `@keyframes shake {
            10%, 90% {
              transform: translate3d(-1px, 0, 0);
            }
            
            20%, 80% {
              transform: translate3d(2px, 0, 0);
            }
          
            30%, 50%, 70% {
              transform: translate3d(-4px, 0, 0);
            }
          
            40%, 60% {
              transform: translate3d(4px, 0, 0);
            }
          }`
        ];
    }

    static html(){
        return `
            <div class="two-factor-input" ref="wrapper">
                <div class="flex-h" >
                    <div class="two-factor-number"><input ref="num-1" type="number" name="num-1" placeholder=" " /></div>
                    <div class="two-factor-number"><input ref="num-2" type="number" name="num-2" placeholder=" " /></div>
                    <div class="two-factor-number"><input ref="num-3" type="number" name="num-3" placeholder=" " /></div>
                    <div class="two-factor-number"><input ref="num-4" type="number" name="num-4" placeholder=" " /></div>
                    <div class="two-factor-number"><input ref="num-5" type="number" name="num-5" placeholder=" " /></div>
                    <div class="two-factor-number"><input ref="num-6" type="number" name="num-6" placeholder=" " /></div>
                </div>
                <div class="two-factor-progress">
                    <m-ring ref="ring" size="20" color="#007bc7" animate ></m-ring>
                </div>
            </div>
            <slot></slot>
        `;
    }

    initializeInput( index ){
        const input = this.ref('num-'+index);

        input.addEventListener('focus', () => {

            if(this.ref('wrapper').classList.contains('error')){
                this.ref('wrapper').classList.remove('error');
                this.dispatchEvent(new Event('reset'));
            }

            input.value = '';
            app.log(this.values.length, index);
            let i = index;
            while( i <= 6 ){
                this.ref('num-'+(i)).value = '';
                this.ref('num-'+(i)).dispatchEvent(new Event('input'));
                i++;
            }

            if(index > 1 && this.values.length < index ){
                this.ref('num-'+(this.values.length+1)).focus();
            }
        });

        input.addEventListener('input', () => {

            

            if( input.value.length > 1 ){
                input.value = input.value[input.value.length-1];
            }

            this.values[index] = input.value;

            if(input.value == '') return false;


            if( index < 6 ){
                this.ref('num-'+(index+1)).focus();
            }
            
            if( this.value.length == 6 ){
                if(this.linkedInput){
                    this.linkedInput.value = this.value;
                    this.linkedInput.dispatchEvent(new Event('input'))
                }
                if(this.autoCheck) this.checkValid();
                this.emit('filled', this.value );
            }else{
                this.emit('unfilled', this.value );
            }
        });

        input.addEventListener('keydown', (event) => {
            const code = event.keyCode;
            if (code == 8 && input.value == '' && index > 1 ) {
                this.ref('num-'+(index-1)).focus();
            }
        }, false);

        if(index == 1){
            input.focus();
        }
    }

    get value(){
        return this.values.join('').replace(' ','');
    }

    focus(){
        this.ref('num-1').focus();
    }

    checkValid(){
        const ring = this.ref('ring');
        ring.spin();
        this.ref('wrapper').classList.add('checking');
        api.post('auth/two-factor', { secret_2fa: this.value }).then((resp) => {

            if(resp.data.valid){
                ring.stop('success');
                this.ref('wrapper').classList.remove('error');
                this.ref('wrapper').classList.add('valid');
                this.dispatchEvent(new Event('valid'));
            }else{
                ring.stop('error');
                this.ref('wrapper').classList.remove('valid');
                this.ref('wrapper').classList.add('error');
                this.dispatchEvent(new Event('invalid'));
            }

            setTimeout( () => { 
                this.ref('wrapper').classList.remove('checking');
            }, 1000 );

        }).catch((e) => {
            ring.stop('error');
            this.ref('wrapper').classList.remove('valid');
            this.ref('wrapper').classList.add('error');
            setTimeout( () => { 
                this.ref('wrapper').classList.remove('checking');
            }, 1000 );
            this.dispatchEvent(new Event('invalid'));
            return false;
        });
    }

    onReady(){
        for(let i=1;i<=6;i++){
            this.initializeInput(i);
        }

        if(!this.linkedInput){
            this.linkedInput = document.createElement('input');
            this.linkedInput.type = 'hidden';
            this.linkedInput.name = 'two-factor';
            this.appendChild(this.linkedInput);
        }

        if(this.hasAttribute('auto-check')){
            this.autoCheck = true;
            this.ref('wrapper').classList.add('auto-check');
        }


    }

}

customElements.define('two-factor-input', TwoFactorInput );
