import TemplateBase from "./template-base.mjs";


class CenterTemplateComponent extends TemplateBase {

    static tag = 'center-template';

    static config = {
        properties: {
            label: { linked: true },
	
        }
    };

    static get observed(){
		return {
			attributes: ['label'],
			properties: ['label']
		}
	}

    bounds = {
		outer: 500
	};


    controlConfig = {
		label: 'Ring Template',
		inputs: {
			text: {
				type: 'fieldset',
				label: "Text Tokens",
				token: {
					type: 'token',
					multiple: true
				},
			},
			border: {
				type: 'fieldset',
				label: "Borders",
				outerBorder: {
					type: 'border',
					label: 'Outer Border Style'
				}
			}
		}
	}



    static get style(){
        return [];
    }

    static html(){
        return `
        
        `;
    }


    control( key, value ){

        if(value === undefined) return;

    }
}

customElements.define( CenterTemplateComponent.tag, CenterTemplateComponent );
