import {ComponentFactory, h, render} from "preact";
import {find} from "./dom/traverse";
import {merge} from "./extend";


/**
 * Mounts the given class on all elements of the given selector
 */
export function mount (
    selector : string,
    ComponentToMount : {new(...args: any[]): {init(): void}},
    constructorParameters : any[] = [],
    context : Document|HTMLElement = document
)
{
    const elements = find(selector, context);

    for (let i = 0; i < elements.length; i++)
    {
        const mounted = new ComponentToMount(elements[i], ...constructorParameters);
        mounted.init();
    }
}


/**
 * Mounts the component as JSX Component.
 * The matched node must contain the data as JSON encoded content.
 */
export function mountJsx (
    selector : string,
    ComponentToMount : ComponentFactory<any>,
    additionalProps : object = {},
    context : Document|HTMLElement = document
)
{
    const elements = find(selector, context);

    for (let i = 0; i < elements.length; i++)
    {
        try
        {
            const node = elements[i];

            if (node.parentElement === null)
            {
                console.error("Can't mount on container without parent.");
                continue;
            }

            const content = (node.textContent || "").trim();
            let data = (content !== "")
                ? JSON.parse(content)
                : {};
            data = merge(data, additionalProps);

            render(
                h(ComponentToMount, data),
                node.parentElement,
                node
            );
        }
        catch (e)
        {
            console.error("Could not mount component", e);
        }
    }
}