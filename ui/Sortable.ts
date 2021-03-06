import {closest, find, findOne} from "../dom/traverse";
import {delegate, EventIntermediateToken, off, on} from "../dom/events";
import {merge} from "../extend";
//@ts-ignore
import mitt, {Emitter} from "mitt";
import SortableInteraction from "./Sortable/SortableInteraction";

/**
 * Config object for working with ui/sortable
 */
export interface SortableConfig {
    items: string,
    enabled?: boolean;
    handle?: string,
}

export interface SortableResult {
    item: HTMLElement;
    before: HTMLElement|null;
}

/**
 * Event data for the changed event
 */
export interface SortableOnChangedData
{
    items: HTMLElement[];
    result: SortableResult;
}

type SortableEvents = "start" | "end" | "changed";


/**
 * Generic sortable implementation
 */
export default class Sortable
{
    private readonly container : HTMLElement;
    private readonly config : SortableConfig;
    private interaction : null|SortableInteraction;
    private readonly emitter : Emitter;
    private listeners : {[event: string]: EventListener};
    private delegateHandler: EventIntermediateToken|null = null;

    /**
     */
    public constructor (container : HTMLElement, config : SortableConfig)
    {
        this.container = container;
        this.config = merge({
            handle: "",
        }, config) as SortableConfig;
        this.interaction = null;
        this.emitter = mitt();
        this.listeners = {
            move: this.onDragMove.bind(this) as EventListener,
            end: this.onDragEnd.bind(this) as EventListener,
            mouseOut: this.onMouseOut.bind(this) as EventListener,
            scroll: this.onScroll.bind(this) as EventListener,
        };
    }


    /**
     * Initializes the component
     */
    public init (): void
    {
        if (this.delegateHandler)
        {
            this.destroy();
        }

        this.delegateHandler = delegate<MouseEvent>(
            this.container,
            `${this.config.items} ${this.config.handle}`,
            "mousedown",
            event => this.onInteractionStart(event)
        );
    }


    /**
     * Callback on when the interaction starts
     */
    private onInteractionStart (event : MouseEvent) : void
    {
        if (null !== this.interaction)
        {
            return;
        }

        let eventTarget = event.target as HTMLElement;

        if (null === eventTarget)
        {
            return;
        }

        const draggedItem = eventTarget.matches(this.config.items) ? eventTarget : closest(eventTarget, this.config.items) as HTMLElement;

        this.interaction = new SortableInteraction(this.container, draggedItem, this.config.items, event.screenX, event.screenY);
        this.interaction.start();

        // prepare items

        // register event listeners
        on(document.body, "mousemove", this.listeners.move);
        on(document.body, "mouseup", this.listeners.end);
        on(window, "mouseout", this.listeners.mouseOut);
        on(window, "scroll", this.listeners.scroll);

        this.emitter.emit("start", [draggedItem]);
        event.preventDefault();
    }


    /**
     * Event on when the input devices moved while dragging
     */
    private onDragMove (event : MouseEvent) : void
    {
        if (null === this.interaction)
        {
            return;
        }

        this.interaction.onMove(event.screenX, event.screenY);
    }


    /**
     * Event on when the dragging ended
     */
    private onDragEnd (event? : MouseEvent) : void
    {
        if (null === this.interaction)
        {
            return;
        }

        // remove event listeners
        off(document.body, "mousemove", this.listeners.move);
        off(document.body, "mouseup", this.listeners.end);
        off(window, "mouseout", this.listeners.mouseOut);
        off(window, "scroll", this.listeners.scroll);

        // reset current interaction
        const endAction = (event !== undefined)
            ? this.interaction.drop(event.screenX, event.screenY)
            : this.interaction.abort();

        endAction
            .then(
                (result) => {
                    // check for state changes
                    // reload all items and check whether the order has changed
                    const currentItems = find(this.config.items, this.container);

                    if (null === this.interaction)
                    {
                        return;
                    }

                    const orderHasChanged = this.interaction.orderHasChanged();

                    // reset interaction
                    this.interaction = null;

                    // trigger end event
                    this.emitter.emit("end");

                    if (orderHasChanged)
                    {
                        this.emitter.emit("changed", {items: currentItems, result});
                    }
                }
            );
    }


    /**
     * Callback on when the mouse leaves the window
     */
    private onMouseOut (event : MouseEvent) : void
    {
        const html = findOne("html");
        if (event.relatedTarget === html)
        {
            this.onDragEnd();
        }
    }

    /**
     * Callback on scroll
     */
    private onScroll () : void
    {
        if (null === this.interaction)
        {
            return;
        }

        this.interaction.onScroll();
    }


    /**
     * Register an event listener
     */
    public on (event: SortableEvents, callback : (...args : any[]) => void) : void
    {
        this.emitter.on(event, callback);
    }


    /**
     * Destroys the instance
     */
    public destroy () : void
    {
        this.onDragEnd();

        if (this.delegateHandler)
        {
            off(this.container, "mousedown", this.delegateHandler);
            this.delegateHandler = null;
        }
    }
}
