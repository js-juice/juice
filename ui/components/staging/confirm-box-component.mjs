import CustomDom from '../core/Dom/Custom.mjs';
import { setupCSS, formButtonCSS, confirmCSS } from './Styles.mjs';

class ConfirmBoxComponent extends CustomDom.HTMLElement {

    static tag = 'confirm-box';

    static config = {
        emitter: true,
        properties: {
            description: {
                linked: true,
                type: 'string'
            },
            question: {
                linked: true,
                type: 'string'
            },
            ['label-accept']: {
                linked: true,
                type: 'string',
                default: 'Confirm'
            },
            ['label-cancel']: {
                linked: true,
                type: 'string',
                default: 'Cancel'
            }
        }
    }

    static get observedProperties(){
        return ['description', 'question', 'label-accept', 'label-cancel'];
    }

    static get observedAttributes(){
        return ['description', 'question', 'label-accept', 'label-cancel'];
    }

    static html( data ){

        const description = this.description;
        const question = this.question;
        const acceptLabel = this['label-accept'];
        const cancelLabel = this['label-cancel'];

        return `
        <div class="confirm-box" ref="box">
            <header>
                <span ref="question">${question}</span>
            </header>
            <main>
                <div>
                <p ref="description">${description}</p>
                </div>
            </main>
            <footer class="flex-h">
                <div class="spinner flex-static">
                    <loader-ring size="30" ref="spinner" ></loader-ring>
                </div>
                <div class="align-right  w-100">
                <a ref="cancel-btn" class="button sm transparent action cancel">${cancelLabel}</a>
                <a ref="confirm-btn" class="button sm action accept rounded">${acceptLabel}</a>
                </div>
            </footer>
        </div>
        `;
    }

    static get style(){
        return [confirmCSS, formButtonCSS, setupCSS];
    }

    target( element, placement="before" ){
        switch(placement){
            case 'before':
                element.insertBefore( this, element.firstElementChild );
            break;
            case 'after':
                element.appendChild( this );
            break;
        }
    }

    spin(){
        this.ref('spinner').active = true;
    }

    remove(){
        const self = this;
        this.ref('spinner').addEventListener('finished', () => {

            
            self.ref('box').addEventListener('transitionend', () => {
                self.ref('html').addEventListener('transitionend', () => {
                    self.parentNode.removeChild(this);
                });
                self.ref('html').style.height = `5px`;
            });

            self.ref('html').classList.add('remove');
        });
        this.ref('spinner').complete = true;
    }

    onReady(){
        const self = this;
        const rect = this.ref('box').getBoundingClientRect();
        
        function transComplete(){
            self.ref('html').classList.add('open');
            self.ref('html').removeEventListener('transitionend', transComplete )
            return false;
        }

        this.ref('html').addEventListener('transitionend', transComplete );
        this.ref('html').style.height = `${rect.height}px`;

        this.ref('confirm-btn').addEventListener('click', () => {
            this.emit('confirm', () => {
                this.remove();
            });
            return false;
        });

        this.ref('cancel-btn').addEventListener('click', () => {
            this.emit('cancel');
            this.remove();
            return false;
        });
    }

    onPropertyChanged( prop, old, value ){
        switch(prop){
            case 'label-confirm':
                this.ref('confirm-btn').innerText = value;
            break;
            case 'label-cancel':
                this.ref('cancel-btn').innerText = value;
            break;
            case 'question':
                this.ref('question').innerText = value;
            break;
            case 'description':
                this.ref('description').innerText = value;
            break;
        }
    }

}

customElements.define(ConfirmBoxComponent.tag, ConfirmBoxComponent );

