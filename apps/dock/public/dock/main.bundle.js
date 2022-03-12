(function() {
    const env = {"__ENV__":"development","__PACKAGE__":{"version":"1.0.0","name":"obs-tools-widget","description":"![Feature Image](./feature.jpg)"}};
    try {
        if (process) {
            process.env = Object.assign({}, process.env);
            Object.assign(process.env, env);
            return;
        }
    } catch (e) {} // avoid ReferenceError: process is not defined
    globalThis.process = { env:env };
})();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = typeof window !== 'undefined' &&
    window.customElements != null &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
 * `container`.
 */
const removeNodes = (container, start, end = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.removeChild(start);
        start = n;
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updatable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        const nodesToRemove = [];
        const stack = [];
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(element.content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        // Keeps track of the last index associated with a part. We try to delete
        // unnecessary nodes, but we never want to associate two different parts
        // to the same index. They must have a constant node between.
        let lastPartIndex = 0;
        let index = -1;
        let partIndex = 0;
        const { strings, values: { length } } = result;
        while (partIndex < length) {
            const node = walker.nextNode();
            if (node === null) {
                // We've exhausted the content inside a nested template element.
                // Because we still have parts (the outer for-loop), we know:
                // - There is a template in the stack
                // - The walker will find a nextNode outside the template
                walker.currentNode = stack.pop();
                continue;
            }
            index++;
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.hasAttributes()) {
                    const attributes = node.attributes;
                    const { length } = attributes;
                    // Per
                    // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order.
                    // In particular, Edge/IE can return them out of order, so we cannot
                    // assume a correspondence between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < length; i++) {
                        if (endsWith(attributes[i].name, boundAttributeSuffix)) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = strings[partIndex];
                        // Find the attribute name
                        const name = lastAttributeNameRegex.exec(stringForPart)[2];
                        // Find the corresponding attribute
                        // All bound attributes have had a suffix added in
                        // TemplateResult#getHTML to opt out of special attribute
                        // handling. To look up the attribute value we also need to add
                        // the suffix.
                        const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                        const attributeValue = node.getAttribute(attributeLookupName);
                        node.removeAttribute(attributeLookupName);
                        const statics = attributeValue.split(markerRegex);
                        this.parts.push({ type: 'attribute', index, name, strings: statics });
                        partIndex += statics.length - 1;
                    }
                }
                if (node.tagName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
            }
            else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const data = node.data;
                if (data.indexOf(marker) >= 0) {
                    const parent = node.parentNode;
                    const strings = data.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        let insert;
                        let s = strings[i];
                        if (s === '') {
                            insert = createMarker();
                        }
                        else {
                            const match = lastAttributeNameRegex.exec(s);
                            if (match !== null && endsWith(match[2], boundAttributeSuffix)) {
                                s = s.slice(0, match.index) + match[1] +
                                    match[2].slice(0, -boundAttributeSuffix.length) + match[3];
                            }
                            insert = document.createTextNode(s);
                        }
                        parent.insertBefore(insert, node);
                        this.parts.push({ type: 'node', index: ++index });
                    }
                    // If there's no text, we must insert a comment to mark our place.
                    // Else, we can trust it will stick around after cloning.
                    if (strings[lastIndex] === '') {
                        parent.insertBefore(createMarker(), node);
                        nodesToRemove.push(node);
                    }
                    else {
                        node.data = strings[lastIndex];
                    }
                    // We have a part for each match found
                    partIndex += lastIndex;
                }
            }
            else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                if (node.data === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of
                    // the following are true:
                    //  * We don't have a previousSibling
                    //  * The previousSibling is already the start of a previous part
                    if (node.previousSibling === null || index === lastPartIndex) {
                        index++;
                        parent.insertBefore(createMarker(), node);
                    }
                    lastPartIndex = index;
                    this.parts.push({ type: 'node', index });
                    // If we don't have a nextSibling, keep this node so we have an end.
                    // Else, we can remove it to save future costs.
                    if (node.nextSibling === null) {
                        node.data = '';
                    }
                    else {
                        nodesToRemove.push(node);
                        index--;
                    }
                    partIndex++;
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        // TODO (justinfagnani): consider whether it's even worth it to
                        // make bindings in comments work
                        this.parts.push({ type: 'node', index: -1 });
                        partIndex++;
                    }
                }
            }
        }
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const endsWith = (str, suffix) => {
    const index = str.length - suffix.length;
    return index >= 0 && str.slice(index) === suffix;
};
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-characters
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
 * space character except " ".
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = 
// eslint-disable-next-line no-control-regex
/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

const walkerNodeFilter = 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */;
/**
 * Removes the list of nodes from a Template safely. In addition to removing
 * nodes from the Template, the Template part indices are updated to match
 * the mutated Template DOM.
 *
 * As the template is walked the removal state is tracked and
 * part indices are adjusted as needed.
 *
 * div
 *   div#1 (remove) <-- start removing (removing node is div#1)
 *     div
 *       div#2 (remove)  <-- continue removing (removing node is still div#1)
 *         div
 * div <-- stop removing since previous sibling is the removing node (div#1,
 * removed 4 nodes)
 */
function removeNodesFromTemplate(template, nodesToRemove) {
    const { element: { content }, parts } = template;
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let part = parts[partIndex];
    let nodeIndex = -1;
    let removeCount = 0;
    const nodesToRemoveInTemplate = [];
    let currentRemovingNode = null;
    while (walker.nextNode()) {
        nodeIndex++;
        const node = walker.currentNode;
        // End removal if stepped past the removing node
        if (node.previousSibling === currentRemovingNode) {
            currentRemovingNode = null;
        }
        // A node to remove was found in the template
        if (nodesToRemove.has(node)) {
            nodesToRemoveInTemplate.push(node);
            // Track node we're removing
            if (currentRemovingNode === null) {
                currentRemovingNode = node;
            }
        }
        // When removing, increment count by which to adjust subsequent part indices
        if (currentRemovingNode !== null) {
            removeCount++;
        }
        while (part !== undefined && part.index === nodeIndex) {
            // If part is in a removed node deactivate it by setting index to -1 or
            // adjust the index as needed.
            part.index = currentRemovingNode !== null ? -1 : part.index - removeCount;
            // go to the next active part.
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
            part = parts[partIndex];
        }
    }
    nodesToRemoveInTemplate.forEach((n) => n.parentNode.removeChild(n));
}
const countNodes = (node) => {
    let count = (node.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */) ? 0 : 1;
    const walker = document.createTreeWalker(node, walkerNodeFilter, null, false);
    while (walker.nextNode()) {
        count++;
    }
    return count;
};
const nextActiveIndexInTemplateParts = (parts, startIndex = -1) => {
    for (let i = startIndex + 1; i < parts.length; i++) {
        const part = parts[i];
        if (isTemplatePartActive(part)) {
            return i;
        }
    }
    return -1;
};
/**
 * Inserts the given node into the Template, optionally before the given
 * refNode. In addition to inserting the node into the Template, the Template
 * part indices are updated to match the mutated Template DOM.
 */
function insertNodeIntoTemplate(template, node, refNode = null) {
    const { element: { content }, parts } = template;
    // If there's no refNode, then put node at end of template.
    // No part indices need to be shifted in this case.
    if (refNode === null || refNode === undefined) {
        content.appendChild(node);
        return;
    }
    const walker = document.createTreeWalker(content, walkerNodeFilter, null, false);
    let partIndex = nextActiveIndexInTemplateParts(parts);
    let insertCount = 0;
    let walkerIndex = -1;
    while (walker.nextNode()) {
        walkerIndex++;
        const walkerNode = walker.currentNode;
        if (walkerNode === refNode) {
            insertCount = countNodes(node);
            refNode.parentNode.insertBefore(node, refNode);
        }
        while (partIndex !== -1 && parts[partIndex].index === walkerIndex) {
            // If we've inserted the node, simply adjust all subsequent parts
            if (insertCount > 0) {
                while (partIndex !== -1) {
                    parts[partIndex].index += insertCount;
                    partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
                }
                return;
            }
            partIndex = nextActiveIndexInTemplateParts(parts, partIndex);
        }
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this.__parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // There are a number of steps in the lifecycle of a template instance's
        // DOM fragment:
        //  1. Clone - create the instance fragment
        //  2. Adopt - adopt into the main document
        //  3. Process - find part markers and create parts
        //  4. Upgrade - upgrade custom elements
        //  5. Update - set node, attribute, property, etc., values
        //  6. Connect - connect to the document. Optional and outside of this
        //     method.
        //
        // We have a few constraints on the ordering of these steps:
        //  * We need to upgrade before updating, so that property values will pass
        //    through any property setters.
        //  * We would like to process before upgrading so that we're sure that the
        //    cloned fragment is inert and not disturbed by self-modifying DOM.
        //  * We want custom elements to upgrade even in disconnected fragments.
        //
        // Given these constraints, with full custom elements support we would
        // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
        //
        // But Safari does not implement CustomElementRegistry#upgrade, so we
        // can not implement that order and still have upgrade-before-update and
        // upgrade disconnected fragments. So we instead sacrifice the
        // process-before-upgrade constraint, since in Custom Elements v1 elements
        // must not modify their light DOM in the constructor. We still have issues
        // when co-existing with CEv0 elements like Polymer 1, and with polyfills
        // that don't strictly adhere to the no-modification rule because shadow
        // DOM, which may be created in the constructor, is emulated by being placed
        // in the light DOM.
        //
        // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
        // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
        // in one step.
        //
        // The Custom Elements v1 polyfill supports upgrade(), so the order when
        // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
        // Connect.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const stack = [];
        const parts = this.template.parts;
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        let partIndex = 0;
        let nodeIndex = 0;
        let part;
        let node = walker.nextNode();
        // Loop through all the nodes and parts of a template
        while (partIndex < parts.length) {
            part = parts[partIndex];
            if (!isTemplatePartActive(part)) {
                this.__parts.push(undefined);
                partIndex++;
                continue;
            }
            // Progress the tree walker until we find our next part's node.
            // Note that multiple parts may share the same node (attribute parts
            // on a single element), so this loop may not run at all.
            while (nodeIndex < part.index) {
                nodeIndex++;
                if (node.nodeName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
                if ((node = walker.nextNode()) === null) {
                    // We've exhausted the content inside a nested template element.
                    // Because we still have parts (the outer for-loop), we know:
                    // - There is a template in the stack
                    // - The walker will find a nextNode outside the template
                    walker.currentNode = stack.pop();
                    node = walker.nextNode();
                }
            }
            // We've arrived at our part's node.
            if (part.type === 'node') {
                const part = this.processor.handleTextExpression(this.options);
                part.insertAfterNode(node.previousSibling);
                this.__parts.push(part);
            }
            else {
                this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
            }
            partIndex++;
        }
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = window.trustedTypes &&
    trustedTypes.createPolicy('lit-html', { createHTML: (s) => s });
const commentMarker = ` ${marker} `;
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const l = this.strings.length - 1;
        let html = '';
        let isCommentBinding = false;
        for (let i = 0; i < l; i++) {
            const s = this.strings[i];
            // For each binding we want to determine the kind of marker to insert
            // into the template source before it's parsed by the browser's HTML
            // parser. The marker type is based on whether the expression is in an
            // attribute, text, or comment position.
            //   * For node-position bindings we insert a comment with the marker
            //     sentinel as its text content, like <!--{{lit-guid}}-->.
            //   * For attribute bindings we insert just the marker sentinel for the
            //     first binding, so that we support unquoted attribute bindings.
            //     Subsequent bindings can use a comment marker because multi-binding
            //     attributes must be quoted.
            //   * For comment bindings we insert just the marker sentinel so we don't
            //     close the comment.
            //
            // The following code scans the template source, but is *not* an HTML
            // parser. We don't need to track the tree structure of the HTML, only
            // whether a binding is inside a comment, and if not, if it appears to be
            // the first binding in an attribute.
            const commentOpen = s.lastIndexOf('<!--');
            // We're in comment position if we have a comment open with no following
            // comment close. Because <-- can appear in an attribute value there can
            // be false positives.
            isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                s.indexOf('-->', commentOpen + 1) === -1;
            // Check to see if we have an attribute-like sequence preceding the
            // expression. This can match "name=value" like structures in text,
            // comments, and attribute values, so there can be false-positives.
            const attributeMatch = lastAttributeNameRegex.exec(s);
            if (attributeMatch === null) {
                // We're only in this branch if we don't have a attribute-like
                // preceding sequence. For comments, this guards against unusual
                // attribute values like <div foo="<!--${'bar'}">. Cases like
                // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                // below.
                html += s + (isCommentBinding ? commentMarker : nodeMarker);
            }
            else {
                // For attributes we use just a marker sentinel, and also append a
                // $lit$ suffix to the name to opt-out of attribute-specific parsing
                // that IE and Edge do for style and certain SVG attributes.
                html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                    attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                    marker;
            }
        }
        html += this.strings[l];
        return html;
    }
    getTemplateElement() {
        const template = document.createElement('template');
        let value = this.getHTML();
        if (policy !== undefined) {
            // this is secure because `this.strings` is a TemplateStringsArray.
            // TODO: validate this when
            // https://github.com/tc39/proposal-array-is-template-object is
            // implemented.
            value = policy.createHTML(value);
        }
        template.innerHTML = value;
        return template;
    }
}

const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
const isIterable = (value) => {
    return Array.isArray(value) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!(value && value[Symbol.iterator]);
};
/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attribute. The value is only set once even if there are multiple parts
 * for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        const parts = this.parts;
        // If we're assigning an attribute via syntax like:
        //    attr="${foo}"  or  attr=${foo}
        // but not
        //    attr="${foo} ${bar}" or attr="${foo} baz"
        // then we don't want to coerce the attribute value into one long
        // string. Instead we want to just return the value itself directly,
        // so that sanitizeDOMValue can get the actual value rather than
        // String(value)
        // The exception is if v is an array, in which case we do want to smash
        // it together into a string without calling String() on the array.
        //
        // This also allows trusted values (when using TrustedTypes) being
        // assigned to DOM sinks without being stringified in the process.
        if (l === 1 && strings[0] === '' && strings[1] === '') {
            const v = parts[0].value;
            if (typeof v === 'symbol') {
                return String(v);
            }
            if (typeof v === 'string' || !isIterable(v)) {
                return v;
            }
        }
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (isPrimitive(v) || !isIterable(v)) {
                    text += typeof v === 'string' ? v : String(v);
                }
                else {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
/**
 * A Part that controls all or part of an attribute value.
 */
class AttributePart {
    constructor(committer) {
        this.value = undefined;
        this.committer = committer;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */
class NodePart {
    constructor(options) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.options = options;
    }
    /**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part.__insert(this.startNode = createMarker());
        part.__insert(this.endNode = createMarker());
    }
    /**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref.__insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        if (this.startNode.parentNode === null) {
            return;
        }
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        const value = this.__pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this.__commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this.__commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this.__commitNode(value);
        }
        else if (isIterable(value)) {
            this.__commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this.__commitText(value);
        }
    }
    __insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    __commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this.__insert(value);
        this.value = value;
    }
    __commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        // If `value` isn't already a string, we explicitly convert it here in case
        // it can't be implicitly converted - i.e. it's a symbol.
        const valueAsString = typeof value === 'string' ? value : String(value);
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = valueAsString;
        }
        else {
            this.__commitNode(document.createTextNode(valueAsString));
        }
        this.value = value;
    }
    __commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this.__commitNode(fragment);
            this.value = instance;
        }
    }
    __commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this.__pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const value = !!this.__pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
            this.value = value;
        }
        this.__pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the third
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
// Wrap into an IIFE because MS Edge <= v41 does not support having try/catch
// blocks right into the body of a module
(() => {
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('test', options, options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
        // event options not supported
    }
})();
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this.__boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const newListener = this.__pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        if (shouldAddListener) {
            this.__options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        this.value = newListener;
        this.__pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

const parts = new WeakMap();
/**
 * Renders a template result or other value to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result Any value renderable by NodePart - typically a TemplateResult
 *     created by evaluating a template tag like `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render$1 = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const committer = new PropertyCommitter(element, name.slice(1), strings);
            return committer.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const committer = new AttributeCommitter(element, name, strings);
        return committer.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
if (typeof window !== 'undefined') {
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.4.1');
}
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

// Get a key to lookup in `templateCaches`.
const getTemplateCacheKey = (type, scopeName) => `${type}--${scopeName}`;
let compatibleShadyCSSVersion = true;
if (typeof window.ShadyCSS === 'undefined') {
    compatibleShadyCSSVersion = false;
}
else if (typeof window.ShadyCSS.prepareTemplateDom === 'undefined') {
    console.warn(`Incompatible ShadyCSS version detected. ` +
        `Please update to at least @webcomponents/webcomponentsjs@2.0.2 and ` +
        `@webcomponents/shadycss@1.3.1.`);
    compatibleShadyCSSVersion = false;
}
/**
 * Template factory which scopes template DOM using ShadyCSS.
 * @param scopeName {string}
 */
const shadyTemplateFactory = (scopeName) => (result) => {
    const cacheKey = getTemplateCacheKey(result.type, scopeName);
    let templateCache = templateCaches.get(cacheKey);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(cacheKey, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    const key = result.strings.join(marker);
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        const element = result.getTemplateElement();
        if (compatibleShadyCSSVersion) {
            window.ShadyCSS.prepareTemplateDom(element, scopeName);
        }
        template = new Template(result, element);
        templateCache.keyString.set(key, template);
    }
    templateCache.stringsArray.set(result.strings, template);
    return template;
};
const TEMPLATE_TYPES = ['html', 'svg'];
/**
 * Removes all style elements from Templates for the given scopeName.
 */
const removeStylesFromLitTemplates = (scopeName) => {
    TEMPLATE_TYPES.forEach((type) => {
        const templates = templateCaches.get(getTemplateCacheKey(type, scopeName));
        if (templates !== undefined) {
            templates.keyString.forEach((template) => {
                const { element: { content } } = template;
                // IE 11 doesn't support the iterable param Set constructor
                const styles = new Set();
                Array.from(content.querySelectorAll('style')).forEach((s) => {
                    styles.add(s);
                });
                removeNodesFromTemplate(template, styles);
            });
        }
    });
};
const shadyRenderSet = new Set();
/**
 * For the given scope name, ensures that ShadyCSS style scoping is performed.
 * This is done just once per scope name so the fragment and template cannot
 * be modified.
 * (1) extracts styles from the rendered fragment and hands them to ShadyCSS
 * to be scoped and appended to the document
 * (2) removes style elements from all lit-html Templates for this scope name.
 *
 * Note, <style> elements can only be placed into templates for the
 * initial rendering of the scope. If <style> elements are included in templates
 * dynamically rendered to the scope (after the first scope render), they will
 * not be scoped and the <style> will be left in the template and rendered
 * output.
 */
const prepareTemplateStyles = (scopeName, renderedDOM, template) => {
    shadyRenderSet.add(scopeName);
    // If `renderedDOM` is stamped from a Template, then we need to edit that
    // Template's underlying template element. Otherwise, we create one here
    // to give to ShadyCSS, which still requires one while scoping.
    const templateElement = !!template ? template.element : document.createElement('template');
    // Move styles out of rendered DOM and store.
    const styles = renderedDOM.querySelectorAll('style');
    const { length } = styles;
    // If there are no styles, skip unnecessary work
    if (length === 0) {
        // Ensure prepareTemplateStyles is called to support adding
        // styles via `prepareAdoptedCssText` since that requires that
        // `prepareTemplateStyles` is called.
        //
        // ShadyCSS will only update styles containing @apply in the template
        // given to `prepareTemplateStyles`. If no lit Template was given,
        // ShadyCSS will not be able to update uses of @apply in any relevant
        // template. However, this is not a problem because we only create the
        // template for the purpose of supporting `prepareAdoptedCssText`,
        // which doesn't support @apply at all.
        window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
        return;
    }
    const condensedStyle = document.createElement('style');
    // Collect styles into a single style. This helps us make sure ShadyCSS
    // manipulations will not prevent us from being able to fix up template
    // part indices.
    // NOTE: collecting styles is inefficient for browsers but ShadyCSS
    // currently does this anyway. When it does not, this should be changed.
    for (let i = 0; i < length; i++) {
        const style = styles[i];
        style.parentNode.removeChild(style);
        condensedStyle.textContent += style.textContent;
    }
    // Remove styles from nested templates in this scope.
    removeStylesFromLitTemplates(scopeName);
    // And then put the condensed style into the "root" template passed in as
    // `template`.
    const content = templateElement.content;
    if (!!template) {
        insertNodeIntoTemplate(template, condensedStyle, content.firstChild);
    }
    else {
        content.insertBefore(condensedStyle, content.firstChild);
    }
    // Note, it's important that ShadyCSS gets the template that `lit-html`
    // will actually render so that it can update the style inside when
    // needed (e.g. @apply native Shadow DOM case).
    window.ShadyCSS.prepareTemplateStyles(templateElement, scopeName);
    const style = content.querySelector('style');
    if (window.ShadyCSS.nativeShadow && style !== null) {
        // When in native Shadow DOM, ensure the style created by ShadyCSS is
        // included in initially rendered output (`renderedDOM`).
        renderedDOM.insertBefore(style.cloneNode(true), renderedDOM.firstChild);
    }
    else if (!!template) {
        // When no style is left in the template, parts will be broken as a
        // result. To fix this, we put back the style node ShadyCSS removed
        // and then tell lit to remove that node from the template.
        // There can be no style in the template in 2 cases (1) when Shady DOM
        // is in use, ShadyCSS removes all styles, (2) when native Shadow DOM
        // is in use ShadyCSS removes the style if it contains no content.
        // NOTE, ShadyCSS creates its own style so we can safely add/remove
        // `condensedStyle` here.
        content.insertBefore(condensedStyle, content.firstChild);
        const removes = new Set();
        removes.add(condensedStyle);
        removeNodesFromTemplate(template, removes);
    }
};
/**
 * Extension to the standard `render` method which supports rendering
 * to ShadowRoots when the ShadyDOM (https://github.com/webcomponents/shadydom)
 * and ShadyCSS (https://github.com/webcomponents/shadycss) polyfills are used
 * or when the webcomponentsjs
 * (https://github.com/webcomponents/webcomponentsjs) polyfill is used.
 *
 * Adds a `scopeName` option which is used to scope element DOM and stylesheets
 * when native ShadowDOM is unavailable. The `scopeName` will be added to
 * the class attribute of all rendered DOM. In addition, any style elements will
 * be automatically re-written with this `scopeName` selector and moved out
 * of the rendered DOM and into the document `<head>`.
 *
 * It is common to use this render method in conjunction with a custom element
 * which renders a shadowRoot. When this is done, typically the element's
 * `localName` should be used as the `scopeName`.
 *
 * In addition to DOM scoping, ShadyCSS also supports a basic shim for css
 * custom properties (needed only on older browsers like IE11) and a shim for
 * a deprecated feature called `@apply` that supports applying a set of css
 * custom properties to a given location.
 *
 * Usage considerations:
 *
 * * Part values in `<style>` elements are only applied the first time a given
 * `scopeName` renders. Subsequent changes to parts in style elements will have
 * no effect. Because of this, parts in style elements should only be used for
 * values that will never change, for example parts that set scope-wide theme
 * values or parts which render shared style elements.
 *
 * * Note, due to a limitation of the ShadyDOM polyfill, rendering in a
 * custom element's `constructor` is not supported. Instead rendering should
 * either done asynchronously, for example at microtask timing (for example
 * `Promise.resolve()`), or be deferred until the first time the element's
 * `connectedCallback` runs.
 *
 * Usage considerations when using shimmed custom properties or `@apply`:
 *
 * * Whenever any dynamic changes are made which affect
 * css custom properties, `ShadyCSS.styleElement(element)` must be called
 * to update the element. There are two cases when this is needed:
 * (1) the element is connected to a new parent, (2) a class is added to the
 * element that causes it to match different custom properties.
 * To address the first case when rendering a custom element, `styleElement`
 * should be called in the element's `connectedCallback`.
 *
 * * Shimmed custom properties may only be defined either for an entire
 * shadowRoot (for example, in a `:host` rule) or via a rule that directly
 * matches an element with a shadowRoot. In other words, instead of flowing from
 * parent to child as do native css custom properties, shimmed custom properties
 * flow only from shadowRoots to nested shadowRoots.
 *
 * * When using `@apply` mixing css shorthand property names with
 * non-shorthand names (for example `border` and `border-width`) is not
 * supported.
 */
const render = (result, container, options) => {
    if (!options || typeof options !== 'object' || !options.scopeName) {
        throw new Error('The `scopeName` option is required.');
    }
    const scopeName = options.scopeName;
    const hasRendered = parts.has(container);
    const needsScoping = compatibleShadyCSSVersion &&
        container.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ &&
        !!container.host;
    // Handle first render to a scope specially...
    const firstScopeRender = needsScoping && !shadyRenderSet.has(scopeName);
    // On first scope render, render into a fragment; this cannot be a single
    // fragment that is reused since nested renders can occur synchronously.
    const renderContainer = firstScopeRender ? document.createDocumentFragment() : container;
    render$1(result, renderContainer, Object.assign({ templateFactory: shadyTemplateFactory(scopeName) }, options));
    // When performing first scope render,
    // (1) We've rendered into a fragment so that there's a chance to
    // `prepareTemplateStyles` before sub-elements hit the DOM
    // (which might cause them to render based on a common pattern of
    // rendering in a custom element's `connectedCallback`);
    // (2) Scope the template with ShadyCSS one time only for this scope.
    // (3) Render the fragment into the container and make sure the
    // container knows its `part` is the one we just rendered. This ensures
    // DOM will be re-used on subsequent renders.
    if (firstScopeRender) {
        const part = parts.get(renderContainer);
        parts.delete(renderContainer);
        // ShadyCSS might have style sheets (e.g. from `prepareAdoptedCssText`)
        // that should apply to `renderContainer` even if the rendered value is
        // not a TemplateInstance. However, it will only insert scoped styles
        // into the document if `prepareTemplateStyles` has already been called
        // for the given scope name.
        const template = part.value instanceof TemplateInstance ?
            part.value.template :
            undefined;
        prepareTemplateStyles(scopeName, renderContainer, template);
        removeNodes(container, container.firstChild);
        container.appendChild(renderContainer);
        parts.set(container, part);
    }
    // After elements have hit the DOM, update styling if this is the
    // initial render to this container.
    // This is needed whenever dynamic changes are made so it would be
    // safest to do every render; however, this would regress performance
    // so we leave it up to the user to call `ShadyCSS.styleElement`
    // for dynamic changes.
    if (!hasRendered && needsScoping) {
        window.ShadyCSS.styleElement(container.host);
    }
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var _a;
/**
 * Use this module if you want to create your own base class extending
 * [[UpdatingElement]].
 * @packageDocumentation
 */
/*
 * When using Closure Compiler, JSCompiler_renameProperty(property, object) is
 * replaced at compile time by the munged name for object[property]. We cannot
 * alias this function, so we have to use a small shim that has the same
 * behavior when not compiling.
 */
window.JSCompiler_renameProperty =
    (prop, _obj) => prop;
const defaultConverter = {
    toAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value ? '' : null;
            case Object:
            case Array:
                // if the value is `null` or `undefined` pass this through
                // to allow removing/no change behavior.
                return value == null ? value : JSON.stringify(value);
        }
        return value;
    },
    fromAttribute(value, type) {
        switch (type) {
            case Boolean:
                return value !== null;
            case Number:
                return value === null ? null : Number(value);
            case Object:
            case Array:
                // Type assert to adhere to Bazel's "must type assert JSON parse" rule.
                return JSON.parse(value);
        }
        return value;
    }
};
/**
 * Change function that returns true if `value` is different from `oldValue`.
 * This method is used as the default for a property's `hasChanged` function.
 */
const notEqual = (value, old) => {
    // This ensures (old==NaN, value==NaN) always returns false
    return old !== value && (old === old || value === value);
};
const defaultPropertyDeclaration = {
    attribute: true,
    type: String,
    converter: defaultConverter,
    reflect: false,
    hasChanged: notEqual
};
const STATE_HAS_UPDATED = 1;
const STATE_UPDATE_REQUESTED = 1 << 2;
const STATE_IS_REFLECTING_TO_ATTRIBUTE = 1 << 3;
const STATE_IS_REFLECTING_TO_PROPERTY = 1 << 4;
/**
 * The Closure JS Compiler doesn't currently have good support for static
 * property semantics where "this" is dynamic (e.g.
 * https://github.com/google/closure-compiler/issues/3177 and others) so we use
 * this hack to bypass any rewriting by the compiler.
 */
const finalized = 'finalized';
/**
 * Base element class which manages element properties and attributes. When
 * properties change, the `update` method is asynchronously called. This method
 * should be supplied by subclassers to render updates as desired.
 * @noInheritDoc
 */
class UpdatingElement extends HTMLElement {
    constructor() {
        super();
        this.initialize();
    }
    /**
     * Returns a list of attributes corresponding to the registered properties.
     * @nocollapse
     */
    static get observedAttributes() {
        // note: piggy backing on this to ensure we're finalized.
        this.finalize();
        const attributes = [];
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this._classProperties.forEach((v, p) => {
            const attr = this._attributeNameForProperty(p, v);
            if (attr !== undefined) {
                this._attributeToPropertyMap.set(attr, p);
                attributes.push(attr);
            }
        });
        return attributes;
    }
    /**
     * Ensures the private `_classProperties` property metadata is created.
     * In addition to `finalize` this is also called in `createProperty` to
     * ensure the `@property` decorator can add property metadata.
     */
    /** @nocollapse */
    static _ensureClassProperties() {
        // ensure private storage for property declarations.
        if (!this.hasOwnProperty(JSCompiler_renameProperty('_classProperties', this))) {
            this._classProperties = new Map();
            // NOTE: Workaround IE11 not supporting Map constructor argument.
            const superProperties = Object.getPrototypeOf(this)._classProperties;
            if (superProperties !== undefined) {
                superProperties.forEach((v, k) => this._classProperties.set(k, v));
            }
        }
    }
    /**
     * Creates a property accessor on the element prototype if one does not exist
     * and stores a PropertyDeclaration for the property with the given options.
     * The property setter calls the property's `hasChanged` property option
     * or uses a strict identity check to determine whether or not to request
     * an update.
     *
     * This method may be overridden to customize properties; however,
     * when doing so, it's important to call `super.createProperty` to ensure
     * the property is setup correctly. This method calls
     * `getPropertyDescriptor` internally to get a descriptor to install.
     * To customize what properties do when they are get or set, override
     * `getPropertyDescriptor`. To customize the options for a property,
     * implement `createProperty` like this:
     *
     * static createProperty(name, options) {
     *   options = Object.assign(options, {myOption: true});
     *   super.createProperty(name, options);
     * }
     *
     * @nocollapse
     */
    static createProperty(name, options = defaultPropertyDeclaration) {
        // Note, since this can be called by the `@property` decorator which
        // is called before `finalize`, we ensure storage exists for property
        // metadata.
        this._ensureClassProperties();
        this._classProperties.set(name, options);
        // Do not generate an accessor if the prototype already has one, since
        // it would be lost otherwise and that would never be the user's intention;
        // Instead, we expect users to call `requestUpdate` themselves from
        // user-defined accessors. Note that if the super has an accessor we will
        // still overwrite it
        if (options.noAccessor || this.prototype.hasOwnProperty(name)) {
            return;
        }
        const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
        const descriptor = this.getPropertyDescriptor(name, key, options);
        if (descriptor !== undefined) {
            Object.defineProperty(this.prototype, name, descriptor);
        }
    }
    /**
     * Returns a property descriptor to be defined on the given named property.
     * If no descriptor is returned, the property will not become an accessor.
     * For example,
     *
     *   class MyElement extends LitElement {
     *     static getPropertyDescriptor(name, key, options) {
     *       const defaultDescriptor =
     *           super.getPropertyDescriptor(name, key, options);
     *       const setter = defaultDescriptor.set;
     *       return {
     *         get: defaultDescriptor.get,
     *         set(value) {
     *           setter.call(this, value);
     *           // custom action.
     *         },
     *         configurable: true,
     *         enumerable: true
     *       }
     *     }
     *   }
     *
     * @nocollapse
     */
    static getPropertyDescriptor(name, key, options) {
        return {
            // tslint:disable-next-line:no-any no symbol in index
            get() {
                return this[key];
            },
            set(value) {
                const oldValue = this[name];
                this[key] = value;
                this
                    .requestUpdateInternal(name, oldValue, options);
            },
            configurable: true,
            enumerable: true
        };
    }
    /**
     * Returns the property options associated with the given property.
     * These options are defined with a PropertyDeclaration via the `properties`
     * object or the `@property` decorator and are registered in
     * `createProperty(...)`.
     *
     * Note, this method should be considered "final" and not overridden. To
     * customize the options for a given property, override `createProperty`.
     *
     * @nocollapse
     * @final
     */
    static getPropertyOptions(name) {
        return this._classProperties && this._classProperties.get(name) ||
            defaultPropertyDeclaration;
    }
    /**
     * Creates property accessors for registered properties and ensures
     * any superclasses are also finalized.
     * @nocollapse
     */
    static finalize() {
        // finalize any superclasses
        const superCtor = Object.getPrototypeOf(this);
        if (!superCtor.hasOwnProperty(finalized)) {
            superCtor.finalize();
        }
        this[finalized] = true;
        this._ensureClassProperties();
        // initialize Map populated in observedAttributes
        this._attributeToPropertyMap = new Map();
        // make any properties
        // Note, only process "own" properties since this element will inherit
        // any properties defined on the superClass, and finalization ensures
        // the entire prototype chain is finalized.
        if (this.hasOwnProperty(JSCompiler_renameProperty('properties', this))) {
            const props = this.properties;
            // support symbols in properties (IE11 does not support this)
            const propKeys = [
                ...Object.getOwnPropertyNames(props),
                ...(typeof Object.getOwnPropertySymbols === 'function') ?
                    Object.getOwnPropertySymbols(props) :
                    []
            ];
            // This for/of is ok because propKeys is an array
            for (const p of propKeys) {
                // note, use of `any` is due to TypeSript lack of support for symbol in
                // index types
                // tslint:disable-next-line:no-any no symbol in index
                this.createProperty(p, props[p]);
            }
        }
    }
    /**
     * Returns the property name for the given attribute `name`.
     * @nocollapse
     */
    static _attributeNameForProperty(name, options) {
        const attribute = options.attribute;
        return attribute === false ?
            undefined :
            (typeof attribute === 'string' ?
                attribute :
                (typeof name === 'string' ? name.toLowerCase() : undefined));
    }
    /**
     * Returns true if a property should request an update.
     * Called when a property value is set and uses the `hasChanged`
     * option for the property if present or a strict identity check.
     * @nocollapse
     */
    static _valueHasChanged(value, old, hasChanged = notEqual) {
        return hasChanged(value, old);
    }
    /**
     * Returns the property value for the given attribute value.
     * Called via the `attributeChangedCallback` and uses the property's
     * `converter` or `converter.fromAttribute` property option.
     * @nocollapse
     */
    static _propertyValueFromAttribute(value, options) {
        const type = options.type;
        const converter = options.converter || defaultConverter;
        const fromAttribute = (typeof converter === 'function' ? converter : converter.fromAttribute);
        return fromAttribute ? fromAttribute(value, type) : value;
    }
    /**
     * Returns the attribute value for the given property value. If this
     * returns undefined, the property will *not* be reflected to an attribute.
     * If this returns null, the attribute will be removed, otherwise the
     * attribute will be set to the value.
     * This uses the property's `reflect` and `type.toAttribute` property options.
     * @nocollapse
     */
    static _propertyValueToAttribute(value, options) {
        if (options.reflect === undefined) {
            return;
        }
        const type = options.type;
        const converter = options.converter;
        const toAttribute = converter && converter.toAttribute ||
            defaultConverter.toAttribute;
        return toAttribute(value, type);
    }
    /**
     * Performs element initialization. By default captures any pre-set values for
     * registered properties.
     */
    initialize() {
        this._updateState = 0;
        this._updatePromise =
            new Promise((res) => this._enableUpdatingResolver = res);
        this._changedProperties = new Map();
        this._saveInstanceProperties();
        // ensures first update will be caught by an early access of
        // `updateComplete`
        this.requestUpdateInternal();
    }
    /**
     * Fixes any properties set on the instance before upgrade time.
     * Otherwise these would shadow the accessor and break these properties.
     * The properties are stored in a Map which is played back after the
     * constructor runs. Note, on very old versions of Safari (<=9) or Chrome
     * (<=41), properties created for native platform properties like (`id` or
     * `name`) may not have default values set in the element constructor. On
     * these browsers native properties appear on instances and therefore their
     * default value will overwrite any element default (e.g. if the element sets
     * this.id = 'id' in the constructor, the 'id' will become '' since this is
     * the native platform default).
     */
    _saveInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        this.constructor
            ._classProperties.forEach((_v, p) => {
            if (this.hasOwnProperty(p)) {
                const value = this[p];
                delete this[p];
                if (!this._instanceProperties) {
                    this._instanceProperties = new Map();
                }
                this._instanceProperties.set(p, value);
            }
        });
    }
    /**
     * Applies previously saved instance properties.
     */
    _applyInstanceProperties() {
        // Use forEach so this works even if for/of loops are compiled to for loops
        // expecting arrays
        // tslint:disable-next-line:no-any
        this._instanceProperties.forEach((v, p) => this[p] = v);
        this._instanceProperties = undefined;
    }
    connectedCallback() {
        // Ensure first connection completes an update. Updates cannot complete
        // before connection.
        this.enableUpdating();
    }
    enableUpdating() {
        if (this._enableUpdatingResolver !== undefined) {
            this._enableUpdatingResolver();
            this._enableUpdatingResolver = undefined;
        }
    }
    /**
     * Allows for `super.disconnectedCallback()` in extensions while
     * reserving the possibility of making non-breaking feature additions
     * when disconnecting at some point in the future.
     */
    disconnectedCallback() {
    }
    /**
     * Synchronizes property values when attributes change.
     */
    attributeChangedCallback(name, old, value) {
        if (old !== value) {
            this._attributeToProperty(name, value);
        }
    }
    _propertyToAttribute(name, value, options = defaultPropertyDeclaration) {
        const ctor = this.constructor;
        const attr = ctor._attributeNameForProperty(name, options);
        if (attr !== undefined) {
            const attrValue = ctor._propertyValueToAttribute(value, options);
            // an undefined value does not change the attribute.
            if (attrValue === undefined) {
                return;
            }
            // Track if the property is being reflected to avoid
            // setting the property again via `attributeChangedCallback`. Note:
            // 1. this takes advantage of the fact that the callback is synchronous.
            // 2. will behave incorrectly if multiple attributes are in the reaction
            // stack at time of calling. However, since we process attributes
            // in `update` this should not be possible (or an extreme corner case
            // that we'd like to discover).
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_ATTRIBUTE;
            if (attrValue == null) {
                this.removeAttribute(attr);
            }
            else {
                this.setAttribute(attr, attrValue);
            }
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_ATTRIBUTE;
        }
    }
    _attributeToProperty(name, value) {
        // Use tracking info to avoid deserializing attribute value if it was
        // just set from a property setter.
        if (this._updateState & STATE_IS_REFLECTING_TO_ATTRIBUTE) {
            return;
        }
        const ctor = this.constructor;
        // Note, hint this as an `AttributeMap` so closure clearly understands
        // the type; it has issues with tracking types through statics
        // tslint:disable-next-line:no-unnecessary-type-assertion
        const propName = ctor._attributeToPropertyMap.get(name);
        if (propName !== undefined) {
            const options = ctor.getPropertyOptions(propName);
            // mark state reflecting
            this._updateState = this._updateState | STATE_IS_REFLECTING_TO_PROPERTY;
            this[propName] =
                // tslint:disable-next-line:no-any
                ctor._propertyValueFromAttribute(value, options);
            // mark state not reflecting
            this._updateState = this._updateState & ~STATE_IS_REFLECTING_TO_PROPERTY;
        }
    }
    /**
     * This protected version of `requestUpdate` does not access or return the
     * `updateComplete` promise. This promise can be overridden and is therefore
     * not free to access.
     */
    requestUpdateInternal(name, oldValue, options) {
        let shouldRequestUpdate = true;
        // If we have a property key, perform property update steps.
        if (name !== undefined) {
            const ctor = this.constructor;
            options = options || ctor.getPropertyOptions(name);
            if (ctor._valueHasChanged(this[name], oldValue, options.hasChanged)) {
                if (!this._changedProperties.has(name)) {
                    this._changedProperties.set(name, oldValue);
                }
                // Add to reflecting properties set.
                // Note, it's important that every change has a chance to add the
                // property to `_reflectingProperties`. This ensures setting
                // attribute + property reflects correctly.
                if (options.reflect === true &&
                    !(this._updateState & STATE_IS_REFLECTING_TO_PROPERTY)) {
                    if (this._reflectingProperties === undefined) {
                        this._reflectingProperties = new Map();
                    }
                    this._reflectingProperties.set(name, options);
                }
            }
            else {
                // Abort the request if the property should not be considered changed.
                shouldRequestUpdate = false;
            }
        }
        if (!this._hasRequestedUpdate && shouldRequestUpdate) {
            this._updatePromise = this._enqueueUpdate();
        }
    }
    /**
     * Requests an update which is processed asynchronously. This should
     * be called when an element should update based on some state not triggered
     * by setting a property. In this case, pass no arguments. It should also be
     * called when manually implementing a property setter. In this case, pass the
     * property `name` and `oldValue` to ensure that any configured property
     * options are honored. Returns the `updateComplete` Promise which is resolved
     * when the update completes.
     *
     * @param name {PropertyKey} (optional) name of requesting property
     * @param oldValue {any} (optional) old value of requesting property
     * @returns {Promise} A Promise that is resolved when the update completes.
     */
    requestUpdate(name, oldValue) {
        this.requestUpdateInternal(name, oldValue);
        return this.updateComplete;
    }
    /**
     * Sets up the element to asynchronously update.
     */
    async _enqueueUpdate() {
        this._updateState = this._updateState | STATE_UPDATE_REQUESTED;
        try {
            // Ensure any previous update has resolved before updating.
            // This `await` also ensures that property changes are batched.
            await this._updatePromise;
        }
        catch (e) {
            // Ignore any previous errors. We only care that the previous cycle is
            // done. Any error should have been handled in the previous update.
        }
        const result = this.performUpdate();
        // If `performUpdate` returns a Promise, we await it. This is done to
        // enable coordinating updates with a scheduler. Note, the result is
        // checked to avoid delaying an additional microtask unless we need to.
        if (result != null) {
            await result;
        }
        return !this._hasRequestedUpdate;
    }
    get _hasRequestedUpdate() {
        return (this._updateState & STATE_UPDATE_REQUESTED);
    }
    get hasUpdated() {
        return (this._updateState & STATE_HAS_UPDATED);
    }
    /**
     * Performs an element update. Note, if an exception is thrown during the
     * update, `firstUpdated` and `updated` will not be called.
     *
     * You can override this method to change the timing of updates. If this
     * method is overridden, `super.performUpdate()` must be called.
     *
     * For instance, to schedule updates to occur just before the next frame:
     *
     * ```
     * protected async performUpdate(): Promise<unknown> {
     *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
     *   super.performUpdate();
     * }
     * ```
     */
    performUpdate() {
        // Abort any update if one is not pending when this is called.
        // This can happen if `performUpdate` is called early to "flush"
        // the update.
        if (!this._hasRequestedUpdate) {
            return;
        }
        // Mixin instance properties once, if they exist.
        if (this._instanceProperties) {
            this._applyInstanceProperties();
        }
        let shouldUpdate = false;
        const changedProperties = this._changedProperties;
        try {
            shouldUpdate = this.shouldUpdate(changedProperties);
            if (shouldUpdate) {
                this.update(changedProperties);
            }
            else {
                this._markUpdated();
            }
        }
        catch (e) {
            // Prevent `firstUpdated` and `updated` from running when there's an
            // update exception.
            shouldUpdate = false;
            // Ensure element can accept additional updates after an exception.
            this._markUpdated();
            throw e;
        }
        if (shouldUpdate) {
            if (!(this._updateState & STATE_HAS_UPDATED)) {
                this._updateState = this._updateState | STATE_HAS_UPDATED;
                this.firstUpdated(changedProperties);
            }
            this.updated(changedProperties);
        }
    }
    _markUpdated() {
        this._changedProperties = new Map();
        this._updateState = this._updateState & ~STATE_UPDATE_REQUESTED;
    }
    /**
     * Returns a Promise that resolves when the element has completed updating.
     * The Promise value is a boolean that is `true` if the element completed the
     * update without triggering another update. The Promise result is `false` if
     * a property was set inside `updated()`. If the Promise is rejected, an
     * exception was thrown during the update.
     *
     * To await additional asynchronous work, override the `_getUpdateComplete`
     * method. For example, it is sometimes useful to await a rendered element
     * before fulfilling this Promise. To do this, first await
     * `super._getUpdateComplete()`, then any subsequent state.
     *
     * @returns {Promise} The Promise returns a boolean that indicates if the
     * update resolved without triggering another update.
     */
    get updateComplete() {
        return this._getUpdateComplete();
    }
    /**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     *   class MyElement extends LitElement {
     *     async _getUpdateComplete() {
     *       await super._getUpdateComplete();
     *       await this._myChild.updateComplete;
     *     }
     *   }
     * @deprecated Override `getUpdateComplete()` instead for forward
     *     compatibility with `lit-element` 3.0 / `@lit/reactive-element`.
     */
    _getUpdateComplete() {
        return this.getUpdateComplete();
    }
    /**
     * Override point for the `updateComplete` promise.
     *
     * It is not safe to override the `updateComplete` getter directly due to a
     * limitation in TypeScript which means it is not possible to call a
     * superclass getter (e.g. `super.updateComplete.then(...)`) when the target
     * language is ES5 (https://github.com/microsoft/TypeScript/issues/338).
     * This method should be overridden instead. For example:
     *
     *   class MyElement extends LitElement {
     *     async getUpdateComplete() {
     *       await super.getUpdateComplete();
     *       await this._myChild.updateComplete;
     *     }
     *   }
     */
    getUpdateComplete() {
        return this._updatePromise;
    }
    /**
     * Controls whether or not `update` should be called when the element requests
     * an update. By default, this method always returns `true`, but this can be
     * customized to control when to update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    shouldUpdate(_changedProperties) {
        return true;
    }
    /**
     * Updates the element. This method reflects property values to attributes.
     * It can be overridden to render and keep updated element DOM.
     * Setting properties inside this method will *not* trigger
     * another update.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    update(_changedProperties) {
        if (this._reflectingProperties !== undefined &&
            this._reflectingProperties.size > 0) {
            // Use forEach so this works even if for/of loops are compiled to for
            // loops expecting arrays
            this._reflectingProperties.forEach((v, k) => this._propertyToAttribute(k, this[k], v));
            this._reflectingProperties = undefined;
        }
        this._markUpdated();
    }
    /**
     * Invoked whenever the element is updated. Implement to perform
     * post-updating tasks via DOM APIs, for example, focusing an element.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    updated(_changedProperties) {
    }
    /**
     * Invoked when the element is first updated. Implement to perform one time
     * work on the element after update.
     *
     * Setting properties inside this method will trigger the element to update
     * again after this update cycle completes.
     *
     * @param _changedProperties Map of changed properties with old values
     */
    firstUpdated(_changedProperties) {
    }
}
_a = finalized;
/**
 * Marks class as having finished creating properties.
 */
UpdatingElement[_a] = true;

/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
/**
 * Whether the current browser supports `adoptedStyleSheets`.
 */
const supportsAdoptingStyleSheets = (window.ShadowRoot) &&
    (window.ShadyCSS === undefined || window.ShadyCSS.nativeShadow) &&
    ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);
const constructionToken = Symbol();
class CSSResult {
    constructor(cssText, safeToken) {
        if (safeToken !== constructionToken) {
            throw new Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
        }
        this.cssText = cssText;
    }
    // Note, this is a getter so that it's lazy. In practice, this means
    // stylesheets are not created until the first element instance is made.
    get styleSheet() {
        if (this._styleSheet === undefined) {
            // Note, if `supportsAdoptingStyleSheets` is true then we assume
            // CSSStyleSheet is constructable.
            if (supportsAdoptingStyleSheets) {
                this._styleSheet = new CSSStyleSheet();
                this._styleSheet.replaceSync(this.cssText);
            }
            else {
                this._styleSheet = null;
            }
        }
        return this._styleSheet;
    }
    toString() {
        return this.cssText;
    }
}
/**
 * Wrap a value for interpolation in a [[`css`]] tagged template literal.
 *
 * This is unsafe because untrusted CSS text can be used to phone home
 * or exfiltrate data to an attacker controlled site. Take care to only use
 * this with trusted input.
 */
const unsafeCSS = (value) => {
    return new CSSResult(String(value), constructionToken);
};
const textFromCSSResult = (value) => {
    if (value instanceof CSSResult) {
        return value.cssText;
    }
    else if (typeof value === 'number') {
        return value;
    }
    else {
        throw new Error(`Value passed to 'css' function must be a 'css' function result: ${value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
    }
};
/**
 * Template tag which which can be used with LitElement's [[LitElement.styles |
 * `styles`]] property to set element styles. For security reasons, only literal
 * string values may be used. To incorporate non-literal values [[`unsafeCSS`]]
 * may be used inside a template string part.
 */
const css = (strings, ...values) => {
    const cssText = values.reduce((acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1], strings[0]);
    return new CSSResult(cssText, constructionToken);
};

// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for LitElement usage.
// TODO(justinfagnani): inject version number at build time
(window['litElementVersions'] || (window['litElementVersions'] = []))
    .push('2.5.1');
/**
 * Sentinal value used to avoid calling lit-html's render function when
 * subclasses do not implement `render`
 */
const renderNotImplemented = {};
/**
 * Base element class that manages element properties and attributes, and
 * renders a lit-html template.
 *
 * To define a component, subclass `LitElement` and implement a
 * `render` method to provide the component's template. Define properties
 * using the [[`properties`]] property or the [[`property`]] decorator.
 */
class LitElement extends UpdatingElement {
    /**
     * Return the array of styles to apply to the element.
     * Override this method to integrate into a style management system.
     *
     * @nocollapse
     */
    static getStyles() {
        return this.styles;
    }
    /** @nocollapse */
    static _getUniqueStyles() {
        // Only gather styles once per class
        if (this.hasOwnProperty(JSCompiler_renameProperty('_styles', this))) {
            return;
        }
        // Take care not to call `this.getStyles()` multiple times since this
        // generates new CSSResults each time.
        // TODO(sorvell): Since we do not cache CSSResults by input, any
        // shared styles will generate new stylesheet objects, which is wasteful.
        // This should be addressed when a browser ships constructable
        // stylesheets.
        const userStyles = this.getStyles();
        if (Array.isArray(userStyles)) {
            // De-duplicate styles preserving the _last_ instance in the set.
            // This is a performance optimization to avoid duplicated styles that can
            // occur especially when composing via subclassing.
            // The last item is kept to try to preserve the cascade order with the
            // assumption that it's most important that last added styles override
            // previous styles.
            const addStyles = (styles, set) => styles.reduceRight((set, s) => 
            // Note: On IE set.add() does not return the set
            Array.isArray(s) ? addStyles(s, set) : (set.add(s), set), set);
            // Array.from does not work on Set in IE, otherwise return
            // Array.from(addStyles(userStyles, new Set<CSSResult>())).reverse()
            const set = addStyles(userStyles, new Set());
            const styles = [];
            set.forEach((v) => styles.unshift(v));
            this._styles = styles;
        }
        else {
            this._styles = userStyles === undefined ? [] : [userStyles];
        }
        // Ensure that there are no invalid CSSStyleSheet instances here. They are
        // invalid in two conditions.
        // (1) the sheet is non-constructible (`sheet` of a HTMLStyleElement), but
        //     this is impossible to check except via .replaceSync or use
        // (2) the ShadyCSS polyfill is enabled (:. supportsAdoptingStyleSheets is
        //     false)
        this._styles = this._styles.map((s) => {
            if (s instanceof CSSStyleSheet && !supportsAdoptingStyleSheets) {
                // Flatten the cssText from the passed constructible stylesheet (or
                // undetectable non-constructible stylesheet). The user might have
                // expected to update their stylesheets over time, but the alternative
                // is a crash.
                const cssText = Array.prototype.slice.call(s.cssRules)
                    .reduce((css, rule) => css + rule.cssText, '');
                return unsafeCSS(cssText);
            }
            return s;
        });
    }
    /**
     * Performs element initialization. By default this calls
     * [[`createRenderRoot`]] to create the element [[`renderRoot`]] node and
     * captures any pre-set values for registered properties.
     */
    initialize() {
        super.initialize();
        this.constructor._getUniqueStyles();
        this.renderRoot = this.createRenderRoot();
        // Note, if renderRoot is not a shadowRoot, styles would/could apply to the
        // element's getRootNode(). While this could be done, we're choosing not to
        // support this now since it would require different logic around de-duping.
        if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
            this.adoptStyles();
        }
    }
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */
    createRenderRoot() {
        return this.attachShadow(this.constructor.shadowRootOptions);
    }
    /**
     * Applies styling to the element shadowRoot using the [[`styles`]]
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */
    adoptStyles() {
        const styles = this.constructor._styles;
        if (styles.length === 0) {
            return;
        }
        // There are three separate cases here based on Shadow DOM support.
        // (1) shadowRoot polyfilled: use ShadyCSS
        // (2) shadowRoot.adoptedStyleSheets available: use it
        // (3) shadowRoot.adoptedStyleSheets polyfilled: append styles after
        // rendering
        if (window.ShadyCSS !== undefined && !window.ShadyCSS.nativeShadow) {
            window.ShadyCSS.ScopingShim.prepareAdoptedCssText(styles.map((s) => s.cssText), this.localName);
        }
        else if (supportsAdoptingStyleSheets) {
            this.renderRoot.adoptedStyleSheets =
                styles.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
        }
        else {
            // This must be done after rendering so the actual style insertion is done
            // in `update`.
            this._needsShimAdoptedStyleSheets = true;
        }
    }
    connectedCallback() {
        super.connectedCallback();
        // Note, first update/render handles styleElement so we only call this if
        // connected after first update.
        if (this.hasUpdated && window.ShadyCSS !== undefined) {
            window.ShadyCSS.styleElement(this);
        }
    }
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * @param _changedProperties Map of changed properties with old values
     */
    update(changedProperties) {
        // Setting properties in `render` should not trigger an update. Since
        // updates are allowed after super.update, it's important to call `render`
        // before that.
        const templateResult = this.render();
        super.update(changedProperties);
        // If render is not implemented by the component, don't call lit-html render
        if (templateResult !== renderNotImplemented) {
            this.constructor
                .render(templateResult, this.renderRoot, { scopeName: this.localName, eventContext: this });
        }
        // When native Shadow DOM is used but adoptedStyles are not supported,
        // insert styling after rendering to ensure adoptedStyles have highest
        // priority.
        if (this._needsShimAdoptedStyleSheets) {
            this._needsShimAdoptedStyleSheets = false;
            this.constructor._styles.forEach((s) => {
                const style = document.createElement('style');
                style.textContent = s.cssText;
                this.renderRoot.appendChild(style);
            });
        }
    }
    /**
     * Invoked on each update to perform rendering tasks. This method may return
     * any value renderable by lit-html's `NodePart` - typically a
     * `TemplateResult`. Setting properties inside this method will *not* trigger
     * the element to update.
     */
    render() {
        return renderNotImplemented;
    }
}
/**
 * Ensure this class is marked as `finalized` as an optimization ensuring
 * it will not needlessly try to `finalize`.
 *
 * Note this property name is a string to prevent breaking Closure JS Compiler
 * optimizations. See updating-element.ts for more information.
 */
LitElement['finalized'] = true;
/**
 * Reference to the underlying library method used to render the element's
 * DOM. By default, points to the `render` method from lit-html's shady-render
 * module.
 *
 * **Most users will never need to touch this property.**
 *
 * This  property should not be confused with the `render` instance method,
 * which should be overridden to define a template for the element.
 *
 * Advanced users creating a new base class based on LitElement can override
 * this property to point to a custom render method with a signature that
 * matches [shady-render's `render`
 * method](https://lit-html.polymer-project.org/api/modules/shady_render.html#render).
 *
 * @nocollapse
 */
LitElement.render = render;
/** @nocollapse */
LitElement.shadowRootOptions = { mode: 'open' };

const eventTarget$1 = new EventTarget();

class ConfigChangeEvent extends Event {

    constructor(key, oldValue, newValue) {
        super('change');
        this.key = key;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

}

const store = JSON.parse(localStorage.getItem('obs-tools-store') || "{}");

class Config {

    static on(key, callback) {
        eventTarget$1.addEventListener('change', e => {
            if(e.key == key) {
                callback(e);
            }
        });
    }

    static set(key, value) {
        const oldValue = this.get(key);
        store[key] = value;
        const event = new ConfigChangeEvent(key, oldValue, value);
        eventTarget$1.dispatchEvent(event);
        localStorage.setItem('obs-tools-store', JSON.stringify(store));
    }

    static get(key) {
        return store[key];
    }

    static serialize() {
        return localStorage.getItem('obs-tools-store');
    }

    static fullReset() {
        localStorage.setItem('obs-tools-store', "{}");
        location.reload();
    }

    static copySaveToClipboard() {
        navigator.clipboard.writeText(this.serialize());
    }

}

const tickrate$1 = 1000 / 12;
const lokalStatus$1 = {};
let sourceTypeList = [];
let sourceTypeMap = {};

window.obsState = lokalStatus$1;

const obs$1 = new OBSWebSocket();
const obsWebSocketPort$1 = Config.get('obs-websocket-port') || "localhost:4444";
const obsWebSocketPassword = Config.get('obs-websocket-password') || null;
obs$1.connect({
    address: obsWebSocketPort$1,
    password: obsWebSocketPassword
});

obs$1.on('ConnectionClosed', connectionClosed$1);
obs$1.on('ConnectionOpened', connectionOpende$1);
obs$1.on('AuthenticationSuccess', authSuccess$1);
obs$1.on('AuthenticationFailure', authFailed$1);

function log$2(...args) {
    console.log('[OBS]', ...args);
}

function authFailed$1() {
    log$2('Connection auth failed');
}

function authSuccess$1() {
    log$2('Connection auth success');
}

function connectionClosed$1() {
    log$2('Connection closed');
}

function connectionOpende$1() {
    log$2('Connection opened');

    const reqUpdate = () => {
        Promise.all([
            obs$1.send('GetStats').then(data => {
                lokalStatus$1.stats = data.stats;
            }),
            obs$1.send('GetVideoInfo').then(data => {
                lokalStatus$1.video = data;
            }),
            obs$1.send('GetStreamingStatus').then(data => {
                lokalStatus$1.stream = data;
            })
        ]);
    };
    
    setInterval(reqUpdate, tickrate$1);
    reqUpdate();

    OBS$1.getSourceTypesList().then(data => {
        sourceTypeList = data.types;

        for(let type of sourceTypeList) {
            sourceTypeMap[type.typeId] = type;
        }
    });

    eventTarget.dispatchEvent(new Event('ready'));
}

const eventTarget = new EventTarget();

class OBS$1 {

    static getState() {
        return lokalStatus$1;
    }

    static on(event, callback) {
        return obs$1.on(event, callback);
    }

    static onReady(callback) {
        eventTarget.addEventListener('ready', callback);
        return function remove() {
            eventTarget.removeEventListener('ready', callback);
        }
    }

    static async getScenes() {
        return obs$1.send('GetSceneList').then(data => data.scenes);
    }

    static async getCurrentScene() {
        return obs$1.send('GetCurrentScene').then(data => data.name);
    }

    static async getSourcesList() {
        return obs$1.send('GetSourcesList').then(data => data.sources.map(source => new Source(source)));
    }

    static async getSceneItemList(sceneName) {
        return obs$1.send('GetSceneItemList').then(data => {
            return data.sceneItems.map(item => new Source(item));
        });
    }

    static async getSourceTypesList() {
        return obs$1.send('GetSourceTypesList').then(data => data);
    }

    static async setVolume(sourceName, vol) {
        return obs$1.send('SetVolume', { 'source': sourceName, volume: Math.pow(vol, 2) });
    }

    static async getVolume(sourceName) {
        return obs$1.send('GetVolume', { 'source': sourceName }).then(data => data);
    }

    static async getAudioMonitorType(sourceName) {
        return obs$1.send('GetAudioMonitorType', { 'sourceName': sourceName }).then(data => data);
    }

    static async getAudioActive(sourceName) {
        return obs$1.send('GetAudioActive', { 'sourceName': sourceName }).then(data => data);
    }

    static setCurrentScene(sceneName) {
        console.log(sceneName);
        return obs$1.send('SetCurrentScene', { 'scene-name': sceneName });
    }

}

class Source {

    constructor(sourceJson) {
        this.data = sourceJson;
        this.kind = sourceTypeMap[this.data.sourceKind || this.data.typeId];
    }

    get name() {
        return this.data.sourceName || this.data.name;
    }

    get hasAudio() {
        return this.kind.caps.hasAudio;
    }

    get hasVideo() {
        return this.kind.caps.hasVideo;
    }

}

class Streamlabs$1 {

    static get connected() {
        return this.socket ? this.socket.connected : false;
    }

    static on(event, callback) {
        const listeners = this.listeners;
        listeners[event] = listeners[event] ? listeners[event] : [];
        listeners[event].push(callback);
    }

    static emit(event, msg) {
        const listeners = this.listeners;
        if(listeners[event]) {
            for(let callback of listeners[event]) callback(msg);
        }
    }

    static disconnect() {
        this.socket.disconnect();
    }

    static async connect() {
        return new Promise(async (resolve, reject) => {
            if(!this.socket) {
                const access_token = Config.get('streamlabs-websocket-token');
                const service = `https://sockets.streamlabs.com?token=${access_token}`;

                this.socket = io(service, { transports: ['websocket'] });
    
                this.socket.on('event', (event) => {
                    const events = ['raid', 'follow', 'donation', 'host', 'subscription', 'resub'];

                    if(events.includes(event.type)) {
                        for(let message of event.message) {
                            message.type = event.type;
                            this.emit(event.type, message);
                        }
                    }
                });

                this.socket.on('connect', () => {
                    console.log('connected');
                    resolve(this.connected);
                });

            } else {
                reject();
            }
        }).catch(err => {
            if(err) console.error(err);
        })
    }

}

Config.on('streamlabs-websocket-token', e => {
    console.log(e);
    Streamlabs$1.connect();
});

Streamlabs$1.connect();

Streamlabs$1.socket = null;
Streamlabs$1.listeners = {};

class DockTab extends LitElement {

    static get styles() {
        return css`
            :host {
                display: block;
                box-sizing: border-box;
                overflow: auto;
                user-select: none;
            }
            input, textarea, select {
                user-select: all;
                border: 1px solid #363636;
                border-radius: 3px;
                background: hsl(0, 0%, 10%);
                outline: none;
                color: #eee;
                padding: 5px 8px;
                font-size: 13px;
            }
            [disabled] {
                opacity: 0.75;
            }
            button {
                border: 1px solid rgb(64 64 64);
                border-radius: 3px;
                background: #363636;
                outline: none;
                color: #eee;
                padding: 6px 8px;
                cursor: pointer;
                min-width: 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            button.secondary {
                background: #272727;
                color: #ccc;
                letter-spacing: -1px;
            }
            button:hover {
                background: rgb(60 60 60);
            }
            button:active {
                background: rgb(47 47 47);
            }
            button[disabled] {
                cursor: default;
                background: rgb(47 47 47);
            }
            button.icon-button {
                height: 29px;
                width: 29px;
                min-width: auto;
                vertical-align: bottom;
            }
            button .material-icons {
                font-size: 18px;
            }
            label {
                font-size: 14px;
                opacity: 0.75;
                color: #eee;
                margin: 0;
                display: block;
            }

            ::-webkit-scrollbar {
                width: 8px;
                margin: 0 4px;
                margin-left: 2px;
            }
            ::-webkit-scrollbar-button {
                display: none;
            }
            ::-webkit-scrollbar-track-piece  {
                background: #1c1c1c;
            }
            ::-webkit-scrollbar-thumb {
                background: #333;
                border-radius: 5px;
                border: none;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #444;
            }
            .section {
                margin: 0px;
                border-left: 1px solid rgb(41, 41, 41);
                border-right: 1px solid rgb(41, 41, 41);
                position: relative;
            }
            .section-content {
                padding: 10px;
                background: #1c1c1c;
            }
            .section[section-title]::before {
                content: attr(section-title);
                display: block;
                width: 100%;
                text-align: left;
                font-size: 12px;
                color: rgb(152 152 152);
                font-weight: 400;
                padding: 4px 7px 5px 7px;
                box-sizing: border-box;
                line-height: 18px;
            }
            .row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                margin-bottom: 8px;
                margin-top: 8px;
                margin-left: 10px;
                margin-right: 10px;
            }
        `;
    }

    get active() {
        return this.hasAttribute('active');
    }

    get hidden() {
        return this.hasAttribute('hidden');
    }

    set hidden(bool) {
        if(bool) {
            this.setAttribute('hidden', '');
        } else {
            this.removeAttribute('hidden');
        }
    }

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
            <div>obs-dock-tab</div>
        `;
    }
}

customElements.define('obs-dock-tab', DockTab);

class Switch extends LitElement {

    static get styles() {
        return css`
            :host {
                --button-size: 14px;
                --global-font-color: #eee;
                --accent-color: #2f77b1;
                
                border-radius: 100px;
                overflow: hidden;
                background: black;
                cursor: pointer;
                width: calc(var(--button-size) * 2);
                display: inline-block;
            }
            :host([checked]) .switch-handle {
                transform: translateX(100%);
            }
            .switch {
                z-index: 1;
                position: relative;
            }
            .switch:active .switch-handle-thumb {
                filter: brightness(0.85);
            }
            .switch-handle {
                height: var(--button-size);
                width: var(--button-size);
                position: relative;
                transition: transform .15s cubic-bezier(0.38, 0, 0.08, 1.01);
            }
            .switch-handle::after,
            .switch-handle::before {
                content: "";
                top: 0;
                height: 100%;
                position: absolute;
                width: calc(var(--button-size) * 2);
            }
            .switch-handle::after {
                left: 50%;
                background: #444;
            }
            .switch-handle::before {
                right: 50%;    
                background: var(--accent-color);
            }
            .switch-handle-thumb {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                position: relative;
                z-index: 1000;
                background: var(--global-font-color);
            }
        `;
    }

    static get properties() {
        return {
            checked: {}
        };
    }

    get checked() {
        return this.hasAttribute('checked') && this.getAttribute('checked') != "false";
    }

    set checked(value) {
        if (value === false) {
            this.removeAttribute('checked');
        } else if (value === true) {
            this.setAttribute('checked', '');
        }
    }

    render() {
        const clickHandler = () => {
            this.checked = !this.checked;
            this.dispatchEvent(new Event('change'));
        };

        return html`
            <div class="switch" @click=${clickHandler}>
                <div class="switch-handle">
                    <div class="switch-handle-thumb"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('input-switch', Switch);

class DockTabSection extends LitElement {

    static get styles() {
        return css`
            :host {
                margin: 0px;
                position: relative;
                display: block;
                --content-padding: 8px 8px 12px 8px;
            }
            .title {
                line-height: 100%;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                text-align: left;
                font-size: 12px;
                color: rgb(152 152 152);
                font-weight: 400;
                padding: 5px 7px 5px 7px;
                box-sizing: border-box;
                margin-bottom: 1px;
            }
            .switch input {
                margin: 0;
            }
            .content {
                display: block;
                padding: var(--content-padding);
            }
            .content:not([enabled]) {
                display: none;
            }
        `;
    }

    constructor() {
        super();

        
        this._enbaled = this.optional ? (Config.get(this.configKey) || false) : true;
    }

    connectedCallback() {
        super.connectedCallback();
        
        this.dispatchEvent(new Event('change'));
    }

    get enabled() {
        return this._enbaled;
    }

    set enabled(bool) {
        this._enbaled = bool;
        Config.set(this.configKey, bool);
        this.update();
        this.dispatchEvent(new Event('setion-change'));
    }

    get sectionTitle() {
        return this.getAttribute("section-title") || "";
    }

    get sectionId() {
        return this.getAttribute("section-title").toLocaleLowerCase().replace(" ", '-');
    }

    get configKey() {
        return 'section-' + this.sectionId + '-enabled';
    }

    get optional() {
        return this.hasAttribute("optional") || false;
    }

    render() {
        const updateEnabled = enabled => {
            this.enabled = enabled;
        };

        return html`
            <div class="header">
                <div class="title">${this.sectionTitle}</div>
                ${!this.optional ? '' : html`
                    <div class="switch">
                        <input-switch ?checked="${this.enabled}" type="checkbox" @change="${e => updateEnabled(e.target.checked)}"></input-switch>
                    </div>
                `}
            </div>
            <slot class="content" ?enabled="${this.enabled}"></slot>
        `;
    }
}

customElements.define('obs-dock-tab-section', DockTabSection);

// Streamlabs stuff

let subs = Config.get('sub-counter') || 0;
let donated = Config.get('donation-counter') || 0;

Streamlabs$1.on('subscription', handleSub$1);
Streamlabs$1.on('resub', handleSub$1);
Streamlabs$1.on('donation', handleDonation$1);

function handleDonation$1(e) {
    const amount = +e.formatted_amount.replace(/[\€|\$]/g, '');
    donated += amount;
    Config.set('donation-counter', donated);

    const history = Config.get('event-history');
    history.unshift(e);
    Config.set('event-history', history);
}

function handleSub$1(e) {
    subs++;
    Config.set('sub-counter', subs);
    
    const history = Config.get('event-history');
    history.unshift(e);
    Config.set('event-history', history);
}

if(!Config.get('donation-counter')) {
    Config.set('donation-counter', donated);
}

if(!Config.get('sub-counter')) {
    Config.set('sub-counter', subs);
}

if(!Config.get('event-history')) {
    Config.set('event-history', []);
}

// end

if(!Config.get('start-time')) {
    Config.set('start-time', 60 * 60 * 12); // seconds
}

if(!Config.get('sub-add-time')) {
    Config.set('sub-add-time', 60 * 5); // seconds
}

if(!Config.get('donation-add-time')) {
    Config.set('donation-add-time', 60 * 1); // seconds
}

const bc = new BroadcastChannel('obs-tools-widget-com');

class Timer extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                display: grid;
                height: 100%;
                grid-template-rows: auto auto auto auto 1fr auto;
            }
            input {
                display: inline-block;
                width: 40px;
                text-align: center;
            }
            .timer-controls {
                margin: 10px 0px;
                display: grid;
                grid-auto-flow: column;
                justify-items: center;
                justify-content: center;
                grid-gap: 5px;
            }
            .timer-clock {
                display: grid;
                grid-auto-flow: row;
                justify-items: center;
                justify-content: center;
                margin-top: 5px;
            }
            .timer {
                font-size: 28px;
            }
            .sub-timer {
                margin-top: 5px;
                opacity: 0.75;
            }
            .material-icons.inline {
                font-size: 18px;
                vertical-align: middle;
                margin-top: -4px;
                margin-right: 2px;
            }
            select {
                margin-left: 5px;
            }
            .history {
                width: 100%;
                overflow: auto;
                height: 120px;
                border: 1px solid rgb(54, 54, 54);
                background: rgb(26, 26, 26);
                grid-column: 1 / span 2;
            }
            .history-entry {
                font-size: 12px;
                padding: 7px 10px;
                margin: 5px 5px 0px 5px;
                background: #363636;
                border-radius: 3px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .inputs {
                width: 100%;
                display: grid;
                grid-template-columns: auto auto;
                grid-template-rows: auto 1fr;
                grid-gap: 10px;
            }
            .inputs input {
                background: transparent;
                border: none;
            }
            .inputs label {
                display: inline;
            }
            .timer-autoreset {
                margin-top: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
        `;
    }

    constructor() {
        super();

        this.time = 60 * 60 * 12;
        this.elapsedTime = 0;
        this.autoSceneSwitchEnabled = false;
        this.subathonFeaturesEnabled = false;

        if(Config.get('elapsed-time') != null) {
            this.elapsedTime = Config.get('elapsed-time');
        }
        if(Config.get('timer') != null) {
            this.time = Config.get('timer');
        }

        this.timerPlaying = false;

        let lastTick = null;
        const updateTimer = ms => {
            if(ms && lastTick) {
                const delta = ms - lastTick;
                const deltaSecs = delta / 1000;
        
                if(this.time - deltaSecs > 0) {
                    this.time -= deltaSecs;
                    this.elapsedTime += deltaSecs;
                } else {
                    this.time = 0;
                    this.timerPlaying = false;
                    this.onTimerEnd();
                }
                this.update();
            }
            if(this.timerPlaying) {
                setTimeout(() => {
                    updateTimer(Date.now());
                }, 1000 / 12);
            }
            lastTick = ms;
        };
        updateTimer();

        this.pausePlayTimer = () => {
            this.timerPlaying = !this.timerPlaying;

            if(this.time === 0) {
                this.timerPlaying = true;
                this.resetTimer();
            }
    
            if(this.timerPlaying === true) {
                updateTimer();
            }
    
            this.updateOverlayTimer();
            this.update();
        };

        setInterval(() => {
            Config.set('elapsed-time', this.elapsedTime);
            Config.set('timer', this.time);
        }, 2000);

        this.updateOverlayTimer();

        this.obsScenes = [];
        OBS$1.onReady(() => {
            OBS$1.getScenes().then(scenes => {
                this.obsScenes = scenes;
                this.update();
            });
        });

        // subathon features
        const handleDonation = (e) => {
            if(this.subathonFeaturesEnabled) {
                const amount = +e.formatted_amount.replace(/[\€|\$]/g, '');
                const donoAddTime = Config.get('donation-add-time') * amount;
                this.time += donoAddTime;
                if(this.timerPlaying) {
                    this.updateOverlayTimer();
                }
            }
        };
        
        const handleSub = (e) => {
            if(this.subathonFeaturesEnabled) {
                const subAddTime = Config.get('sub-add-time');
                this.time += subAddTime;
                if(this.timerPlaying) {
                    this.updateOverlayTimer();
                }
            }
        };

        Streamlabs$1.on('subscription', handleSub);
        Streamlabs$1.on('resub', handleSub);
        Streamlabs$1.on('donation', handleDonation);

        Config.on('sub-counter', () => {
            subs = Config.get('sub-counter');
            this.update();
        });
        Config.on('dono-counter', () => {
            donated = Config.get('donation-counter');
            this.update();
        });
        Config.on('event-history', () => this.update());
    }

    removeHistoryEntry(entry) {
        const history = Config.get('event-history');
        history.splice(history.indexOf(entry), 1);
        Config.set('event-history', history);
    }

    updateOverlayTimer() {
        bc.postMessage({ 
            subs: subs,
            donated: donated,
            type:'timer', 
            time: this.time,
            playstate: this.timerPlaying
        });
    }

    resetTimer() {
        if(confirm('Reset timer to start time?')) {
            this.forceReset();
        }
    }

    forceReset() {
        const startTime = Config.get('start-time');
        this.time = startTime;
        this.elapsedTime = 0;
        this.updateOverlayTimer();
        this.update();

        Config.set('sub-counter', 0);
        Config.set('donation-counter', 0);
    }

    onTimerEnd() {
        if(this.autoSceneSwitchEnabled) {
            const selectEle = this.shadowRoot.querySelector('#autoSwitchSceneSelect');
            const sceneToSwitchTo = selectEle.value;
            if(sceneToSwitchTo && sceneToSwitchTo !== "none") {
                OBS$1.setCurrentScene(sceneToSwitchTo);
            }
        }
        if(this.shadowRoot.querySelector('#autoreset').checked) {
            this.forceReset();
            setTimeout(() => this.pausePlayTimer(), 1000);
        }
    }

    pausePlayTimer() {}

    addMinute() {
        this.time += 60;
        this.update();
        this.updateOverlayTimer();
    }

    subtractMinute() {
        this.time -= 60;
        this.update();
        this.updateOverlayTimer();
    }

    render() {
        const startTime = Config.get('start-time');
        const hours = Math.floor(startTime / 60 / 60);
        const minutes = Math.floor(startTime / 60) % 60;
        const seconds = Math.floor(startTime) % 60;

        const elapsedHours = Math.round((this.elapsedTime + 0.5) / 60 / 60);
        const elapsedMinutes = Math.round((this.elapsedTime + 0.5) / 60) % 60;
        const elapsedSeconds = Math.round((this.elapsedTime + 0.5)) % 60;

        const timerHours = Math.floor(this.time / 60 / 60);
        const timerMinutes = Math.floor(this.time / 60) % 60;
        const timerSeconds = Math.floor(this.time) % 60;

        const subAddTime = Config.get('sub-add-time');
        const subMinutes = Math.floor(subAddTime / 60) % 60;
        const subSeconds = Math.floor(subAddTime) % 60;

        const donoAddTime = Config.get('donation-add-time');
        const donoMinutes = Math.floor(donoAddTime / 60) % 60;
        const donoSeconds = Math.floor(donoAddTime) % 60;

        const updateStartTime = () => {
            const h = this.shadowRoot.querySelector('#startTimeH').value, 
                  m = this.shadowRoot.querySelector('#startTimeM').value, 
                  s = this.shadowRoot.querySelector('#startTimeS').value;

            const time = (h * 60 * 60) + (m * 60) + (s);
            Config.set('start-time', time);
        };

        const updateSubTime = () => {
            const m = this.shadowRoot.querySelector('#subTimeM').value, 
                  s = this.shadowRoot.querySelector('#subTimeS').value;

            const time = (m * 60) + (s);
            Config.set('sub-add-time', time);
        };

        const updateDonoTime = () => {
            const m = this.shadowRoot.querySelector('#donoTimeM').value, 
                  s = this.shadowRoot.querySelector('#donoTimeS').value;

            const time = (m * 60) + (s);
            Config.set('donation-add-time', time);
        };

        const history = Config.get('event-history');

        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Timer">
                <div class="timer-clock">
                    <div class="timer">
                        ${timerHours.toFixed(0).padStart(2, "0")}
                        :
                        ${timerMinutes.toFixed(0).padStart(2, "0")}
                        :
                        ${timerSeconds.toFixed(0).padStart(2, "0")}
                    </div>
                    <div class="sub-timer">
                        <span class="material-icons inline">timer</span>
                        ${elapsedHours.toFixed(0).padStart(2, "0")}
                        :
                        ${elapsedMinutes.toFixed(0).padStart(2, "0")}
                        :
                        ${elapsedSeconds.toFixed(0).padStart(2, "0")}
                    </div>
                </div>
                <div class="timer-controls">
                    <button class="icon-button" @click="${() => this.pausePlayTimer()}">
                        <span class="material-icons">
                            ${this.timerPlaying ? "pause" : "play_arrow"}
                        </span>
                    </button>
                    <button @click="${() => this.resetTimer()}" class="secondary icon-button">
                        <span class="material-icons">replay</span>
                    </button>
                    <button @click="${() => this.addMinute()}" class="secondary">+1 m</button>
                    <button @click="${() => this.subtractMinute()}" class="secondary">-1 m</button>
                </div> 
            </obs-dock-tab-section>
            
            <obs-dock-tab-section section-title="Timer Settings">
                <div class="timer-settings">
                    <div class="row">
                        <label>Start</label>
                        <div>
                            <gyro-fluid-input id="startTimeH" min="0" max="999" steps="1" @change="${e => updateStartTime()}" value="${hours}" suffix="h"></gyro-fluid-input>
                            <gyro-fluid-input id="startTimeM" min="0" max="59" steps="1" @change="${e => updateStartTime()}" value="${minutes}" suffix="m"></gyro-fluid-input>
                            <gyro-fluid-input id="startTimeS" min="0" max="59" steps="1" @change="${e => updateStartTime()}" value="${seconds}" suffix="s"></gyro-fluid-input>
                        </div>
                    </div>
                </div>
            </obs-dock-tab-section>

            <obs-dock-tab-section optional section-title="Subathon Features"
                @setion-change="${(e) => {this.subathonFeaturesEnabled = e.target.enabled;}}">

                <label>Time added by events:</label>
                <div class="row">
                    <label>Sub</label>
                    <div>
                        <gyro-fluid-input id="subTimeM" min="0" max="60" steps="1" @change="${e => updateSubTime()}" value="${subMinutes}" suffix="m"></gyro-fluid-input>
                        <gyro-fluid-input id="subTimeS" min="0" max="59" steps="1" @change="${e => updateSubTime()}" value="${subSeconds}" suffix="s"></gyro-fluid-input>
                    </div>
                </div>
                <div class="row">
                    <label>Donation / 1</label>
                    <div>
                        <gyro-fluid-input id="donoTimeM" min="0" max="60" steps="1" @change="${e => updateDonoTime()}" value="${donoMinutes}" suffix="m"></gyro-fluid-input>
                        <gyro-fluid-input id="donoTimeS" min="0" max="59" steps="1" @change="${e => updateDonoTime()}" value="${donoSeconds}" suffix="s"></gyro-fluid-input>
                    </div>
                </div>
                <br/>
                <label>Counters:</label>
                <div class="row">
                    <div class="inputs">
                        <div>
                            <label>Subs</label>
                            <input type="number" value="${subs}" disabled="true"/>
                        </div>
                        <div>
                            <label>Donated</label>
                            <input type="number" value="${donated}" disabled="true"/>
                        </div>
                        <div class="history">
                            ${history.map(entry => {
                                if(entry.type == "resub" || entry.type == "subscription") {
                                    return html`
                                        <div class="history-entry">
                                            <div>${entry.name} subbed.</div>
                                            <button @click="${e => this.removeHistoryEntry(entry)}">X</button>
                                        </div>
                                    `;
                                }
                                if(entry.type == "donation") {
                                    return html`
                                        <div class="history-entry">
                                            <div>${entry.name} donated ${entry.formatted_amount}.</div>
                                            <button @click="${e => this.removeHistoryEntry(entry)}">X</button>
                                        </div>
                                    `;
                                }
                            })}
                        </div>
                    </div>

                </div>
            </obs-dock-tab-section>
            
            <obs-dock-tab-section optional section-title="Timed scene switch"
                @setion-change="${(e) => {this.autoSceneSwitchEnabled = e.target.enabled;}}">

                <div class="row">
                    <label>Scene</label>
                    <select id="autoSwitchSceneSelect" ?disabled="${this.obsScenes.length == 0}">
                        ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                            return html`<option value="${name}">${name}</option>`;
                        }) : html`<option value="none">No Scenes Available</option>`}
                    </select>
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-timer', Timer);

const API_CLIENT_ID = "tnjjsvaj7qyuem2as13e4gjsxwftcd";
const API_REDIRECT_URI = "http://localhost:5500/public/dock/authenticated.html";

let api_credentials = null;

function parseHash(str) {
    const res = {};
    str.substring(1).split("&").map(item => item.split("=")).forEach(item => {
        res[item[0]] = unescape(item[1]);
    });
    return res;
}

function log$1(...strs) {
    console.log('[TwitchAPI]', ...strs);
}

class Twitch {

    static get userInfo() {
        return api_credentials.userInfo;
    }

    static get isAuthenticated() {
        return api_credentials !== null;
    }

    static async refreshAccessToken(refresh_token) {
        const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${API_CLIENT_ID}&client_secret=${config.TWITCH_CLIENT_SECRET}`;
        return fetch(url, { method: 'POST' }).then(res => res.json());
    }

    static async revokeAccessToken(access_token) {
        const url = `https://id.twitch.tv/oauth2/revoke?client_id=${API_CLIENT_ID}&token=${access_token}`;
        return fetch(url, { method: 'POST' }).then(res => res.json());
    }

    static requestAccessToken(code) {
        const url = `https://id.twitch.tv/oauth2/token` +
            `?client_id=${API_CLIENT_ID}` +
            `&client_secret=${config.TWITCH_CLIENT_SECRET}` +
            `&code=${code}` +
            `&grant_type=authorization_code` +
            `&redirect_uri=${API_REDIRECT_URI}`;

        return fetch(url, { method: 'POST' })
            .then(res => res.json())
            .then(json => {
                if (json.status) {
                    throw new Error(json.message);
                }
                return json;
            }).catch(err => {
                console.error('Error requesting twitch access token');
            })
    }

    static async getUserInfo() {
        const url = `https://id.twitch.tv/oauth2/userinfo`;

        if(api_credentials && api_credentials.access_token) {
            return fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api_credentials.access_token}`,
                }
            }).then(res => res.json());
        }
        return null;
    }

    static loadAuthentication() {
        const stored = localStorage.getItem('twitch_auth');
        if(stored) {
            const creds = JSON.parse(stored);
            api_credentials = creds;
            return true;
        }
        return false;
    }

    static async authenticate() {
        return new Promise((resolve, reject) => {
            log$1('authorizing...');

            const api_scopes = [
                "openid",
                "bits:read",
                "channel:manage:broadcast",
                "channel:read:hype_train",
                "channel:read:polls",
                "channel:read:predictions",
                "channel:read:redemptions",
                "channel:read:subscriptions",
                "chat:read"
            ];
            const claims = {
                "id_token": {
                    "picture": null,
                    "preferred_username": null
                }
            };
            const url = `https://id.twitch.tv/oauth2/authorize?client_id=${API_CLIENT_ID}&redirect_uri=${API_REDIRECT_URI}&response_type=token+id_token&scope=${api_scopes.join(" ")}&claims=${JSON.stringify(claims)}`;

            const authWin = window.open(url);

            const int = setInterval(async () => {
                console.log('auth loaded');
                const params = parseHash(authWin.location.hash);
                if(params.access_token) {
                    api_credentials = params;

                    const userInfo = await Twitch.getUserInfo();
                    api_credentials.userInfo = userInfo;

                    localStorage.setItem('twitch_auth', JSON.stringify(api_credentials));

                    authWin.close();
                    resolve(params);
                    clearInterval(int);
                }
            }, 200);
        })
    }

    static async fetch(endpoint, args, access_token) {
        // form args object to url search string
        const searchParams = Object.keys(args).map(key => `${key}=${args[key]}`);

        // fetch endpoint
        return fetch(`https://api.twitch.tv/helix/${endpoint}?${searchParams.join('&')}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
                'Client-ID': API_CLIENT_ID
            }
        }).then(async res => {
            const json = await res.json();
            if (json.data) {
                json.data.pagination = json.pagination;
            }
            return json.data;
        }).catch(err => {
            throw err;
        });
    }

    static fetchClips(options) {
        return Twitch.fetch('clips', options, api_credentials.access_token);
    }

    static fetchVideos(options) {
        return Twitch.fetch('videos', options, api_credentials.access_token);
    }

    static fetchStreams(options) {
        return Twitch.fetch('streams', options, api_credentials.access_token);
    }

    static fetchUsers(options) {
        return Twitch.fetch('users', options, api_credentials.access_token);
    }

    static async getUserByLogin(login) {
        if (!api_credentials) {
            throw new Error('Not authenticated')
        }
        const users = await Twitch.fetch('users', { login }, api_credentials.access_token);
        return users[0];
    }

    static async getStreamByLogin(login) {
        if (!api_credentials) {
            throw new Error('Not authenticated')
        }
        const users = await Twitch.fetch('streams', { user_login: login }, api_credentials.access_token);
        return users[0];
    }

    static async getUserFollowers(userName) {
        const userInfo = await getUserByLogin(userName);

        const user = userInfo.data[0];

        async function getFollowerChunk(cursor) {
            const opts = {
                from_id: user.id,
                first: 100,
            };

            if (cursor) {
                opts.after = cursor;
            }

            return await Twitch.fetch('users/follows', opts, api_credentials.access_token);
        }

        const followersTotal = [];

        async function getAllFollowers(cursor) {
            const followers = await getFollowerChunk(cursor);

            followersTotal.push(...followers.data);

            if (followers.pagination.cursor) {
                await getAllFollowers(followers.pagination.cursor);
            }
        }

        await getAllFollowers();

        log$1(`${user.display_name} is following (${followersTotal.length}):`);

        for (let user of followersTotal) {
            log$1(`${user.followed_at}, ${user.to_name}`);
        }
    }

    static async getChannelFollowers(channel) {
        const userInfo = await getUserByLogin(channel);

        const user = userInfo.data[0];

        async function getFollowerChunk(cursor) {
            const opts = {
                to_id: user.id,
                first: 100
            };

            if (cursor) {
                opts.after = cursor;
            }

            return await Twitch.fetch('users/follows', opts, api_credentials.access_token);
        }

        const followersTotal = [];

        async function getAllFollowers(cursor) {
            const followers = await getFollowerChunk(cursor);

            log$1(`${followersTotal.length} / ${followers.total}`);

            followersTotal.push(...followers.data);

            if (followers.pagination.cursor) {
                await getAllFollowers(followers.pagination.cursor);
            }
        }

        await getAllFollowers();

        return followersTotal;
    }

    static async getChannelViewerOverlap(channel1, channel2) {
        log$1('Getting channel followers...');

        const followers1 = await getChannelFollowers(channel1);
        const followers2 = await getChannelFollowers(channel2);

        const hashmap = {};
        let overlap = 0;

        for (let follower of followers1) {
            hashmap[follower.from_id] = 0;
        }
        for (let follower of followers2) {
            if (hashmap[follower.from_id] != null) {
                overlap++;
                hashmap[follower.from_id] = 1;
            }
            hashmap[follower.from_id] = 0;
        }

        log$1(`${overlap} of ${channel1}(${followers1.length}) [${(overlap / followers1.length * 100).toFixed(3)}%] are also in ${channel2}`);
    }

    static async getChannelAllFollowers(channel) {
        log$1('Getting channel followers...');

        const followers = await getChannelFollowers(channel);

        for (let user of followers) {
            log$1(`${user.followed_at}, ${user.from_name}`);
        }
    }

}

class Settings extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                position: relative;
            }
            input.full {
                width: calc(100% - 80px);
            }
            .label {
                display: inline-block;
                width: 80px;
                font-size: 14px;
                opacity: 0.75;
            }
            .client-id {
                font-size: 12px;
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translate(-50%, 0);
                opacity: 0.25;
                user-select: all;
                width: 240px;
            }
        `;  
    }

    constructor() {
        super();
        Twitch.loadAuthentication();
    }

    showToken(id, btn) {
        const input = this.shadowRoot.querySelector('#' + id);
        input.type = "text";
        let timer = 5;
        btn.innerHTML = timer;
        btn.disabled = true;
        const int = setInterval(() => {
            timer--;
            btn.innerHTML = timer;
            if(timer == 0) {
                btn.innerHTML = "show";
                input.type = "password";
                clearInterval(int);
                btn.disabled = false;
            }
        }, 1000);
    }

    render() {
        const obsWebSocketPort = Config.get('obs-websocket-port') || "localhost:4444";
        const obsWebSocketPassword = Config.get('obs-websocket-password') || "password";

        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Streamlabs Integration">
                <label>Streamlabs Websocket Token</label>
                <input value="${Config.get('streamlabs-websocket-token') || ""}" 
                    id="streamlabsWebsocketToken"
                    @change="${e => Config.set('streamlabs-websocket-token', e.target.value)}" 
                    class="full"
                    type="password" 
                    placeholder="Websocket Token"/>
                <button @click="${e => this.showToken("streamlabsWebsocketToken", e.target)}">show</button>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="OBS WebSocket Integration">
                <div style="margin: 5px 0 15px 0;">
                    <label>
                        Install obs-websocket plugin for automation features.
                    </label>
                </div>
                <div class="row">
                    <label>WebSocket URL</label>
                    <input value="${obsWebSocketPort}" 
                        @change="${e => {
                            Config.set('obs-websocket-port', e.target.value);
                        }}" 
                        placeholder="Port"/>
                </div>
                <div class="row">
                    <label>Password</label>
                    <input value="${obsWebSocketPassword}" 
                        type="password"
                        @change="${e => {
                            Config.set('obs-websocket-password', e.target.value);
                        }}" 
                        placeholder="Password"/>
                </div>
            
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Advanced">
                <button @click="${e => location.reload()}">
                    Reload Tool
                </button>
                <button @click="${e => {
                    Config.fullReset();
                }}">
                    Reset Tool
                </button>
            </obs-dock-tab-section>

            <div class="client-id">
                <span>${localStorage.getItem('unique-client-id')}</span>
            </div>
        `;
    }
}

customElements.define('obs-tools-settings', Settings);

const overlays = [
    { name: "Timer Overlay", url: "../overlay/timer.html?layer-name=Timer%20Overlay&layer-width=1920&layer-height=1080" },
    { name: "Subathon Overlay", url: "../overlay/subathon.html?layer-name=Subathon%20Overlay&layer-width=1920&layer-height=1080" },
    { name: "Labels Overlay", url: "../overlay/labels.html?layer-name=Labels%20Overlay&layer-width=1920&layer-height=1080" }
];

class Overlays {

    static getOverlayList() {
        return overlays;
    }

    static addOverlay(name, url) {
        overlays.push({ name, url });
    }

    static removeOverlay(name) {
        let i = 0;
        for(let overlay of overlays) {
            if(overlay.name == name) {
                overlays.splice(i, 1);
                break;
            }
            i++;
        }
    }

}

const tickrate = 1000 / 12;
const lokalStatus = {
    currentScene: ""
};

globalThis.lokalStatus = lokalStatus;

const obs = new OBSWebSocket();
const obsWebSocketPort = Config.get('obs-websocket-port') || "localhost:4444";
obs.connect({ address: obsWebSocketPort });

obs.on('ConnectionClosed', connectionClosed);
obs.on('ConnectionOpened', connectionOpende);
obs.on('AuthenticationSuccess', authSuccess);
obs.on('AuthenticationFailure', authFailed);

obs.on('SwitchScenes', data => {
    lokalStatus.currentScene = data.sceneName;
});

function log(...args) {
    console.log('[OBS]', ...args);
}

function authFailed() {
    log('Connection auth failed');
}

function authSuccess() {
    log('Connection auth success');
}

function connectionClosed() {
    log('Connection closed');
}
let init$1 = false;

async function connectionOpende() {
    log('Connection opened');

    await obs.send('GetCurrentScene').then(data => {
        lokalStatus.currentScene = data.name;
    });
    await obs.send('GetSourceTypesList').then(data => {
        lokalStatus.types = data.types;
    });

    const reqUpdate = () => {
        // scenes
        obs.send('GetSceneList').then(data => {
            lokalStatus.scenes = data.scenes;
            OBS.emit('scenes');
        }),

        obs.send('GetSourcesList').then(async data => {
            for(let source of data.sources) {
                const typesId = source.typeId;
                let hasAudio = false;
                let hasVideo = false;

                for(let type of lokalStatus.types) {
                    if(type.typeId == typesId) {
                        hasAudio = type.caps.hasAudio;
                        hasVideo = type.caps.hasVideo;
                    }
                }

                const name = source.name;
                const volume = await obs.send('GetVolume', {
                    source: name,
                }).then(data => data.volume);
                const muted = await obs.send('GetMute', {
                    source: name,
                }).then(data => data.muted);
                const monitorType = await obs.send('GetAudioMonitorType', {
                    sourceName: name,
                }).then(data => data.monitorType);

                source.monitorType = monitorType;
                source.volume = volume;
                source.muted = muted;
                source.hasAudio = hasAudio;
                source.hasVideo = hasVideo;
            }
            lokalStatus.sources = data.sources;

            OBS.emit('sources');
            OBS.emit('audiomixer');

            if(!init$1) {
                init$1 = true;
                OBS.emit('ready');
            }
        }),
        
        // status
        Promise.all([
            obs.send('ListOutputs').then(data => {
                for(let output of data.outputs) {
                    if(output.name == "VirtualOutput") {
                        lokalStatus.output = output;
                    }
                }
            }),
            obs.send('GetStats').then(data => {
                lokalStatus.stats = data.stats;
            }),
            obs.send('GetVideoInfo').then(data => {
                lokalStatus.video = data;
            }),
            obs.send('GetStreamingStatus').then(data => {
                lokalStatus.stream = data;
            })
        ]).finally(() => {
            OBS.emit('status');
        });

        // transitions
        Promise.all([
            obs.send('GetTransitionList').then(data => {
                lokalStatus.transitions = data.transitions;
            }),
            obs.send('GetCurrentTransition').then(data => {
                lokalStatus.currentTransitions = data;
            })
        ]).finally(() => {
            OBS.emit('transitions');
        });
    };

    obs.on('StreamStatus', data => {
        lokalStatus.streamStatus = data;
        OBS.emit('status');
    });

    obs.on('SourceVolumeChanged', ({ sourceName, volume }) => {
        for(let source of lokalStatus.sources) {
            if(source.name == sourceName) {
                source.volume = volume;
            }
        }
    });

    obs.on('SceneItemSelected', e => {
        OBS.emit("selection", e);
    });
    obs.on('SceneItemDeselected', e => {
        OBS.emit("selection", e);
    });
    
    setInterval(reqUpdate, tickrate);
    reqUpdate();
}

const listeners$1 = {};

class OBS {

    static getState() {
        return lokalStatus;
    }

    static emit(event, data) {
        listeners$1[event] = listeners$1[event] || [];
        for(let callback of listeners$1[event]) {
            callback(data);
        }
    }

    static setCurrentScene(scaneName) {
        return obs.send('SetCurrentScene', {
            'scene-name': scaneName
        });
    }
    
    static setCurrentTransition(transitionName) {
        return obs.send('SetCurrentTransition', {
            'transition-name': transitionName
        });
    }
    
    static setTransitionDuration(ms) {
        return obs.send('SetTransitionDuration', {
            'duration': ms
        });
    }

    static setTransition(scaneName) {
        return obs.send('SetCurrentScene', {
            'scene-name': scaneName
        });
    }

    static setVolume(sourceName, volume) {
        return obs.send('SetVolume', {
            'source': sourceName,
            'volume': volume,
            'useDecibel': false,
        });
    }

    static setMute(sourceName, muted) {
        return obs.send('SetMute', {
            'source': sourceName,
            'mute': muted,
        });
    }

    static setAudioMonitorType(sourceName, monitorType) {
        return obs.send('SetAudioMonitorType', {
            'sourceName': sourceName,
            'monitorType': monitorType,
        });
    }

    static getSourceSettings(source) {
        return obs.send('GetSourceSettings', {
            'sourceName': source.name,
        }).then(res => res.sourceSettings);
    }

    static setSourceSettings(source, sourceSettings = {}) {
        return obs.send('SetSourceSettings', {
            'sourceName': source.name,
            'sourceSettings': sourceSettings
        }).then(res => res.sourceSettings);
    }

    static reorderSceneItems(sceneName, items = []) {
        return obs.send('ReorderSceneItems', {
            'sourceName': sceneName,
            'items': items
        });
    }

    static getSceneItemProperties(sceneItem) {
        return obs.send('GetSceneItemProperties', {
            'item': sceneItem.name,
        }).then(res => res);
    }

    static setSceneItemProperties(sceneName, sceneItem, settings) {
        return obs.send('SetSceneItemProperties', {
            'scene-name': sceneName,
            'item': sceneItem,
            ...settings
        }).then(res => res);
    }

    static on(event, callback) {
        listeners$1[event] = listeners$1[event] || [];
        const listenrIndex = listeners$1[event].push(callback);
        const cancel = () => {
            listeners$1[event].splice(listenrIndex, 1);
        };
        return cancel;
    }

}

const updateCallbacks = [];

class PropertySender {

    constructor() {
        this.channel = new BroadcastChannel('obs-tool-com');
        
        this.selection = [];

        OBS.on('selection', e => {
            switch (e.updateType) {
                case "SceneItemDeselected":
                    let index = 0;
                    for(let item of this.selection) {
                        if(item.itemId == e.itemId) {
                            this.selection.splice(index, 1);
                            break;
                        }
                        index++;
                    }
                    this.update();
                    break;
                case "SceneItemSelected":
                    this.selection.push({
                        itemId: e.itemId,
                        itemName: e.itemName,
                    });
                    break;
            }

            requestAnimationFrame(() => {
                for(let item of this.selection) {
                    item.name = item.itemName;
                    this.requestPropertiesBySource(item);
                }

                this.update();
            });
        });

        this.channel.onmessage = ({ data }) => {
            if(data.type == "properties") {
                this.handleProperties(data.data);
            }
        };
    }

    handleProperties(data) {
        const props = data.properties;

        for(let selected of this.selection) {
            if(selected.source == data.source) {
                selected.props = props;
            }
        }

        this.update();
    }

    requestProperties(source) {
        this.channel.postMessage({ type:'getProperties', data: { source } });
    }

    postProperty(propId, value) {
        this.channel.postMessage({ type: "property.change", data: { property: propId, value } });
    }

    requestPropertiesBySource(source) {
        OBS.getSourceSettings(source).then(settings => {
            if(settings.url) {
                this.requestProperties(settings.url);
                source.source = settings.url;
            }
        });
    }

    update() {
        for(let callback of updateCallbacks) {
            callback();
        }
    }

    onUpdate(callback) {
        updateCallbacks.push(callback);
    }

}

function componentToHex(c) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbaToHex(r, g, b, a) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
}

function hexToRGBA(hex) {
    let r, g, b, a;

    if(hex.length >= 6 + 1) {
        r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16),
        a = 255;

        if(hex.length >= 8 + 1) {
            a = parseInt(hex.slice(7, 9), 16);
        }

    } else if(hex.length == 3 + 1) {
        r = parseInt(hex.slice(1, 2) + hex.slice(1, 2), 16),
        g = parseInt(hex.slice(2, 3) + hex.slice(2, 3), 16),
        b = parseInt(hex.slice(3, 4) + hex.slice(3, 4), 16),
        a = 255;
    }

    return [r, g, b, a];
}

// http://hsl2rgb.nichabi.com/javascript-function.php
function hsl2rgb (h, s, l) {
    var r, g, b, m, c, x;

    h *= 360;
    s *= 100;
    l *= 100;

    if (!isFinite(h)) h = 0;
    if (!isFinite(s)) s = 0;
    if (!isFinite(l)) l = 0;

    h /= 60;
    if (h < 0) h = 6 - (-h % 6);
    h %= 6;

    s = Math.max(0, Math.min(1, s / 100));
    l = Math.max(0, Math.min(1, l / 100));

    c = (1 - Math.abs((2 * l) - 1)) * s;
    x = c * (1 - Math.abs((h % 2) - 1));

    if (h < 1) {
        r = c;
        g = x;
        b = 0;
    } else if (h < 2) {
        r = x;
        g = c;
        b = 0;
    } else if (h < 3) {
        r = 0;
        g = c;
        b = x;
    } else if (h < 4) {
        r = 0;
        g = x;
        b = c;
    } else if (h < 5) {
        r = x;
        g = 0;
        b = c;
    } else {
        r = c;
        g = 0;
        b = x;
    }

    m = l - c / 2;
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return [r, g, b];
}

// https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
function rgb2hsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

class ColorPicker extends LitElement {

    render() {
        return html`
            <style>

            :host {
                display: block;
                -webkit-user-drag: none;
                user-select: none;
                padding: 0px;
                width: 185px;
                border-radius: 6px;
                background: var(--gyro-pallate-panel-content);
                box-sizing: border-box;
                margin: 10px 8px;
                width: 100%;

                --cursor-width: 10px;
                --bar-height: 15px;
                
                --hue: 100;
                --saturation: 100;
                --lightness: 100;
                --alpha: 100;
            }

            .color-picker {
                display: grid;
                grid-gap: 5px;

                --h: calc( var(--hue) * 3.6 );
                --s: calc( var(--saturation) * 1% );
                --l: calc( var(--lightness) * 1% );
                --a: calc( var(--alpha) * 1% );
            }

            .color-bar {
                position: relative;
                height: var(--bar-height);
            }

            .color-bar-cursor {
                position: absolute;
                top: -1px;
                left: 0;
                height: 110%;
                width: var(--cursor-width);
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
                transform: translateX(-50%);
                z-index: 100;
                box-sizing: border-box;
                border-radius: 2px;
                cursor: pointer;
            }

            .color {
                height: 100%;
                width: 100%;
                display: flex;
            }

            .color canvas {
                width: 20px;
            }

            .colorValue {
                display: flex;
            }

            .colorValue label {
                font-size: 12px;
                line-height: 100%;
                opacity: 0.5;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-right: 5px;
                text-transform: uppercase;
            }

            .colorValue input {
                display: flex;
                width: 20%;
                text-align: center;
                background: transparent;
                border: none;
                color: #eee;
                padding: 6px 3px;
                font-size: 12px;
                margin-right: 5px;
                border-radius: 3px;
            }

            .colorValue input:focus,
            .colorValue input:hover {
                background: rgba(0, 0, 0, 0.25);
            }

            .transition .color-bar-cursor {
                transition: left .15s ease-out;
            }

            canvas {
                width: 100%;
                height: 100%;
                background: grey;
                display: block;
                border-radius: 4px;
            }

            .transition canvas {
                transition: background .125s ease-out;
            }

            .color-bar.hue .color-bar-cursor {
                left: calc( var(--hue) * 1% );
                background: hsl(var(--h), 100%, 50%);
            }

            .color-bar.saturation .color-bar-cursor {
                left: var(--s);
                background: hsl(var(--h), var(--s), 50% );
            }

            .color-bar.lightness .color-bar-cursor {
                left: var(--l);
                background: hsl(0, 0%, var(--l));
            }

            .color-bar.alpha .color-bar-cursor {
                left: var(--a);
                background: hsla(var(--h), var(--s), var(--l), var(--a));
            }

            .color-bar.saturation canvas {
                background: linear-gradient(90deg, 
                    hsl(var(--h), 0%, var(--l) ), 
                    hsl(var(--h), 100%, var(--l) )
                );
            }

            .color-bar.lightness canvas {
                background: linear-gradient(90deg, 
                    hsl(var(--h), var(--s), 0%), 
                    hsl(var(--h), var(--s), 100%)
                );
            }

            .color-bar.alpha canvas {
                background: linear-gradient(90deg, 
                    hsla(var(--h), var(--s), var(--l), 0),
                    hsla(var(--h), var(--s), var(--l), 1) 
                );
            }

            .color-bar.color canvas {
                background: hsla(var(--h), var(--s), var(--l), var(--a));
            }

            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none;
                margin: 0;
            }

            </style>

            <div class="color-picker">
                <div class="color-bar hue">
                    <span class="color-bar-cursor"></span>
                    <canvas></canvas>
                </div>

                <div class="color-bar saturation">
                    <span class="color-bar-cursor"></span>
                    <canvas></canvas>
                </div>

                <div class="color-bar lightness">
                    <span class="color-bar-cursor"></span>
                    <canvas></canvas>
                </div>

                <div class="color-bar alpha">
                    <span class="color-bar-cursor"></span>
                    <canvas></canvas>
                </div>

                <div class="color-bar color">
                    <div class="colorValue">
                        <label>rgba</label>
                        <input type="number" id="red"/>
                        <input type="number" id="green"/>
                        <input type="number" id="blue"/>
                        <input type="number" id="alpha"/>
                    </div>
                </div>
            </div>
        `;
    }

    get hsla() {
        return [
            this.hue * 3.6, 
            this.saturation, 
            this.lightness,
            this.alpha / 100
        ];
    }

    get rgba() {
        const hsl = this.hsla;
        const rgb = hsl2rgb(hsl[0] / 360, hsl[1] / 100, hsl[2] / 100);
        return [...rgb, hsl[3]];
    }

    set hue(hue) {
        this._hue = Math.max(Math.min(hue, 100), 0);
        this.style.setProperty('--hue', this._hue);
        this.drawHueScale();
    }
    get hue() {
        return this._hue;
    }

    set saturation(saturation) {
        this._saturation = Math.max(Math.min(saturation, 100), 0);
        this.style.setProperty('--saturation', this._saturation);
        this.drawHueScale();
    }
    get saturation() {
        return this._saturation;
    }

    set lightness(lightness) {
        this._lightness = Math.max(Math.min(lightness, 100), 0);
        this.style.setProperty('--lightness', this._lightness);
        this.drawHueScale();
    }
    get lightness() {
        return this._lightness;
    }

    set alpha(alpha) {
        this._alpha = Math.max(Math.min(alpha, 100), 0);
        this.style.setProperty('--alpha', this._alpha);
        this.drawHueScale();
    }
    get alpha() {
        return this._alpha;
    }

    get hex() {
        return rgbaToHex(this.rgba[0], this.rgba[1], this.rgba[2], Math.floor(this.alpha / 100 * 255));
    }
    set hex(val) {
        const rgba = hexToRGBA(val);
        this.setRGBA([rgba[0], rgba[1], rgba[2], rgba[3] / 255]);
    }

    constructor() {
        super();

        this.update();

        this.hue = 0;
        this.saturation = 50;
        this.lightness = 50;
        this.alpha = 100;

        this.moving = false;
        this.selected = null;

        const hue = this.shadowRoot.querySelector('.color-bar.hue');
        const sat = this.shadowRoot.querySelector('.color-bar.saturation');
        const light = this.shadowRoot.querySelector('.color-bar.lightness');
        const alpha = this.shadowRoot.querySelector('.color-bar.alpha');
        const color = this.shadowRoot.querySelector('.color-bar.color');

        const mousemove = e => {
            const box = hue.getBoundingClientRect();
            const x = Math.max((Math.min((e.x - box.left), box.width) / box.width) * 100, 0);

            this[this.selected] = x;

            this.dispatchEvent(new Event('input'));
        };

        this.addEventListener('mousedown', () => {
            this.moving = true;
            window.addEventListener('mousemove', mousemove);
        });

        window.addEventListener('mouseup', () => {
            this.moving = false;
            window.removeEventListener('mousemove', mousemove);

            this.dispatchEvent(new Event('change'));
        });

        this.addEventListener('wheel', e => {
            const dir = Math.sign(e.deltaY);
            this[this.selected] = this[this.selected] + (dir * 1);

            this.dispatchEvent(new Event('change'));
        });

        hue.addEventListener('mousemove', () => {
            if(!this.moving) this.selected = "hue";
        });
        sat.addEventListener('mousemove', () => {
            if(!this.moving) this.selected = "saturation";
        });
        light.addEventListener('mousemove', () => {
            if(!this.moving) this.selected = "lightness";
        });
        alpha.addEventListener('mousemove', () => {
            if(!this.moving) this.selected = "alpha";
        });
        color.addEventListener('mousemove', () => {
            this.selected = null;
        });

        this.drawHueScale();

        this.shadowRoot.querySelector('#red').oninput = e => {
            const rgba = this.rgba;
            this.setRGBA([
                e.target.value,
                rgba[1],
                rgba[2],
                rgba[3],
            ]);
        };
        this.shadowRoot.querySelector('#green').oninput = e => {
            const rgba = this.rgba;
            this.setRGBA([
                rgba[0],
                e.target.value,
                rgba[2],
                rgba[3],
            ]);
        };
        this.shadowRoot.querySelector('#blue').oninput = e => {
            const rgba = this.rgba;
            this.setRGBA([
                rgba[0],
                rgba[1],
                e.target.value,
                rgba[3],
            ]);
        };
        this.shadowRoot.querySelector('#alpha').oninput = e => {
            const rgba = this.rgba;
            this.setRGBA([
                rgba[0],
                rgba[1],
                rgba[2],
                e.target.value,
            ]);
        };
    }

    setHSLA(hsla) {
        this.shadowRoot.querySelector('.color-picker').classList.add('transition');

        this.hue = hsla[0] / 3.6;
        this.saturation = hsla[1];
        this.lightness = hsla[2];
        this.alpha = hsla[3] * 100;

        setTimeout(() => {
            this.shadowRoot.querySelector('.color-picker').classList.remove('transition');
        }, 15);
    }

    setRGBA(rgba) {
        const hsl = rgb2hsl(rgba[0], rgba[1], rgba[2]);
        this.setHSLA([...hsl, rgba[3]]);
    }

    drawHueScale() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext("2d");

        canvas.width = 360;
        canvas.height = 1;

        for(let x = 0; x < canvas.width; x++) {
            context.fillStyle = `hsl(${x}, 75%, 50%)`;
            context.fillRect(x, 0, 1, canvas.height);
        }

        const hueCanvas = this.shadowRoot.querySelector('.color-bar.hue canvas');
        const hueContext = hueCanvas.getContext("2d");
        hueContext.drawImage(canvas, 0, 0, hueCanvas.width, hueCanvas.height);

        const rgba = this.rgba;

        this.shadowRoot.querySelector('#red').value = rgba[0];
        this.shadowRoot.querySelector('#green').value = rgba[1];
        this.shadowRoot.querySelector('#blue').value = rgba[2];
        this.shadowRoot.querySelector('#alpha').value = rgba[3];
    }

}

customElements.define('color-picker', ColorPicker);

const propSender = new PropertySender();


class Overlay extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            :host {
                height: 100%;
            }
            .drag-and-button {
                color: #eee;
                display: flex;
                justify-content: flex-start;
                align-items: center;
                text-decoration: none;
                padding: 8px 4px;
                font-size: 12.5px;
                cursor: grab;
                border-radius: 4px;
            }
            .drag-and-button:not(:last-child) {
                border-bottom: 1px solid #1a1a1a;
            }
            .drag-and-button:hover {
                background: #363636;
            }
            .drag-and-button:active {
                background: #272727;
                cursor: grabbing;
            }
            i.material-icons {
                font-size: 14px;
                margin: 0 8px 0 4px;
            }
            .container {
                padding: 5px;
            }
            .overlay-section {
                height: auto;
            }
            .properties {
                
            }
            .placeholder {
                text-align: center;
                width: 100%;
                opacity: 0.5;
                margin: 8px 0;
            }
            gyro-fluid-input {
                width: 150px;
            }
            button.reset-property-btn {
                overflow: visible;
                line-height: 100%;
                border: none;
                padding: 0;
                text-align: right;
                width: 28px;
                min-width: 0;
                height: 28px;
                background: transparent;
                margin-left: 10px;
                margin-right: -10px;
                border-radius: 4px;
                border: 1px solid transparent;
            }
            button.reset-property-btn:hover {
                background: #313131;
                border: 1px solid #3f3f3f;
            }
            button.reset-property-btn:active {
                background: #1b1b1b;
            }
            .reset-property-btn i.material-icons {
                font-size: 16px;
            }
        `;
    }

    constructor() {
        super();

        this.selection = propSender.selection;

        propSender.onUpdate(() => this.update());
    }

    resetProperty(propId, prop) {
        propSender.postProperty(propId, prop.default);
        prop.value = prop.default;

        // have to update empty selection because it wouldnt update values on reset property :/
        this.selection = [];
        this.update();
        requestAnimationFrame(() => {
            this.selection = propSender.selection;
            this.update();
        });
    }

    renderProperty(propId, propObj) {
        const id = propId;
        const prop = propObj;
        
        switch(prop.type) {
            case "boolean":
                return html`
                    <label>${prop.name}</label>
                    <div>
                        <input-switch ?checked="${prop.value}" @change="${e => {
                            propSender.postProperty(id, e.target.checked ? 1 : 0);
                        }}"></input-switch>
                        <button class="reset-property-btn" @click="${e => this.resetProperty(id, prop)}">
                            <i class="material-icons">restart_alt</i>
                        </button>
                    </div>
                `;
            case "number":
                return html`
                    <label>${prop.name}</label>
                    <div>
                        <gyro-fluid-input min="0" max="100" .value="${prop.value}" @input="${e => {
                            propSender.postProperty(id, e.target.value);
                        }}"></gyro-fluid-input>
                        <button class="reset-property-btn" @click="${e => this.resetProperty(id, prop)}">
                            <i class="material-icons">restart_alt</i>
                        </button>
                    </div>
                `;
            case "color":
                return html`
                    <label>${prop.name}</label>
                    <button class="reset-property-btn" @click="${e => this.resetProperty(id, prop)}">
                        <i class="material-icons">restart_alt</i>
                    </button>
                    <div>
                        <color-picker .hex="${prop.value}" @input="${e => {
                            propSender.postProperty(id, e.target.hex);
                        }}"></color-picker>
                    </div>
                `;
            default:
                return html`
                    <label>${prop.name}</label>
                    <div>
                        <input value="${prop.value}" @input="${e => {
                            propSender.postProperty(id, e.target.value);
                        }}"/>
                        <button class="reset-property-btn" @click="${e => this.resetProperty(id, prop)}">
                            <i class="material-icons">restart_alt</i>
                        </button>
                    </div>
                `;
        }
    }

    render() {
        const overlays = Overlays.getOverlayList();

        return html`
            <link href="./material-icons.css" rel="stylesheet">
            
            <obs-dock-tab-section .enabled="${true}" optional section-title="Overlay Drag & Drop" class="overlay-section">
                ${overlays.map(overlay => {
                    return html`
                        <a class="drag-and-button" @click="${e => e.preventDefault()}" href="${overlay.url}">
                            <i class="material-icons">layers</i> 
                            <span>${overlay.name}</span>
                        </a>
                    `;
                })}
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Overlay Properties">
                <div class="properties">
                    ${this.selection.map(item => {
                        if(item.props) {
                            return html`
                                <div>${item.itemName}</div>
                                ${Object.keys(item.props).map(key => html`
                                    <div class="row">
                                        ${this.renderProperty(key, item.props[key])}
                                    </div>
                                `)}
                            `;
                        } else {
                            return html`
                                <div>${item.itemName}</div>
                                <div class="placeholder">No custom properties</div>
                            `;
                        }
                    })}

                    ${this.selection.length == 0 ? html`
                        <div class="placeholder">Nothing Selected</div>
                    ` : ""}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-tools-overlay', Overlay);

function setStatus(str) {
    const tabEle = document.querySelector('obs-1uckybot-tab');
    const ele = tabEle.shadowRoot.querySelector('#connStatus');
    ele.innerText = str;
}

let mediaServerWs;
function disbleMediaServerControl() {
    if(mediaServerWs) {
        mediaServerWs.close();
    }
}
function enableMediaServerControl() {
    const host = Config.get('stream-server-url') || "ws://localhost:8000";

    mediaServerWs = new WebSocket(host);

    mediaServerWs.addEventListener('message', msg => {
        const data = JSON.parse(msg.data);
        let scene = null;
        console.log(data);
        switch(data.type) {
            case "stream-connected":
                scene = getSelectedRemoteScene();
                break;
            case "stream-disconnected":
                scene = getSelectedStandbyScene();
                break;
        }
        if(scene) {
            OBS$1.setCurrentScene(scene);
        }
    });

    mediaServerWs.addEventListener('open', msg => {
        console.log("connected to media server websocket");
        setStatus('connected');
    });
    mediaServerWs.addEventListener('close', msg => {
        console.log("disconnected from media server websocket");
        setStatus('disconnected');
    });
}

let getSelectedRemoteScene = () => {
    const ele = document.querySelector('obs-1uckybot-tab');
    const select = ele.shadowRoot.querySelector('#remoteStreamScene');
    return select.value;
};
let getSelectedStandbyScene = () => {
    const ele = document.querySelector('obs-1uckybot-tab');
    const select = ele.shadowRoot.querySelector('#standByScene');
    return select.value;
};

function updateToken(token) {
    if(token != null) {
        Config.set('1uckybot-websocket-token', token);

        // tts overlay entry
        const ttsUrl = `https://1uckybot.luckydye.de/overlay/?token=${token}&voice=Marlene&layer-name=1uckybot%20TTS%20overlay&layer-width=1920&layer-height=1080`;
        Overlays.addOverlay('TTS', ttsUrl);
    }
}

updateToken(Config.get('1uckybot-websocket-token'));

class Luckybot extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            iframe {
                border: none;
            }
        `;
    }

    constructor() {
        super();

        this.obsScenes = [];
        OBS$1.onReady(() => {
            OBS$1.getScenes().then(scenes => {
                this.obsScenes = scenes;
                this.update();
            });
        });
    }

    connectedCallback() {
        super.connectedCallback();
        
        if(Config.get("section-remote-stream controls-enabled")) {
            enableMediaServerControl(); 
        }
    }

    showToken(id, btn) {
        const input = this.shadowRoot.querySelector('#' + id);
        input.type = "text";
        let timer = 5;
        btn.innerHTML = timer;
        btn.disabled = true;
        const int = setInterval(() => {
            timer--;
            btn.innerHTML = timer;
            if(timer == 0) {
                btn.innerHTML = "show";
                input.type = "password";
                clearInterval(int);
                btn.disabled = false;
            }
        }, 1000);
    }

    render() {
        const mediaServerUrl = Config.get('stream-server-url') || "ws://localhost:8000";

        return html`
            <link href="./material-icons.css" rel="stylesheet">
            
            <obs-dock-tab-section section-title="Token">
                <label>1uckybot Access Token</label>
                <input value="${Config.get('1uckybot-websocket-token') || ""}" 
                    id="luckybotWebsocketToken"
                    @change="${e => updateToken(e.target.value)}" 
                    class="full"
                    type="password" 
                    placeholder="1uckybot Token"/>
                <button @click="${e => this.showToken("luckybotWebsocketToken", e.target)}">show</button>
            </obs-dock-tab-section>

            <obs-dock-tab-section optional section-title="Remote Stream Controls" @setion-change="${e => {
                if(e.target.enabled) {
                    enableMediaServerControl();
                } else {
                    disbleMediaServerControl();
                }
            }}">
                <div class="row">
                    <label>WebSocket URL</label>
                    <input value="${mediaServerUrl}" 
                        @change="${e => {
                            Config.set('stream-server-url', e.target.value);
                        }}" 
                        placeholder="IP:Port"/>
                </div>

                <div class="row">
                    <button @click="${() => {
                        setStatus('reconnecting...');
                        disbleMediaServerControl();
                        setTimeout(() => {
                            enableMediaServerControl();
                        }, 2000);
                    }}">Reconnect</button>

                    <span id="connStatus">evaluating...</span>
                </div>

                <br/>
                <div class="row">
                    <label>Remote Scene</label>
                    <select id="remoteStreamScene" ?disabled="${this.obsScenes.length == 0}">
                        ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                            return html`<option value="${name}">${name}</option>`;
                        }) : html`<option value="none">No Scenes Available</option>`}
                    </select>
                </div>
                <div class="row">
                    <label>Standby Scene</label>
                    <select id="standByScene" ?disabled="${this.obsScenes.length == 0}">
                        ${this.obsScenes.length ? this.obsScenes.map(({ name }) => {
                            return html`<option value="${name}">${name}</option>`;
                        }) : html`<option value="none">No Scenes Available</option>`}
                    </select>
                </div>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="TTS">
                <iframe src="https://1uckybot.luckydye.de/overlay/control-panel.html" />
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-1uckybot-tab', Luckybot);

/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 */
var Easing = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    // easeInQuart: (t) => t * t * t * t,
    // easeOutQuart: (t) => 1 - (--t) * t * t * t,
    // easeInOutQuart: (t) => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    // easeInQuint: (t) => t * t * t * t * t,
    // easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
    // easeInOutQuint: (t) => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
};

const lerp = (x, y, a) => x * (1 - a) + y * a;

function interpolateState(a, state1, state2) {
    return {
        crop: {
            bottom: lerp(state1.crop.bottom, state2.crop.bottom, a),
            left: lerp(state1.crop.left, state2.crop.left, a),
            right: lerp(state1.crop.right, state2.crop.right, a),
            top: lerp(state1.crop.top, state2.crop.top, a)
        },
        position: {
            alignment: 5,
            x: lerp(state1.position.x, state2.position.x, a),
            y: lerp(state1.position.y, state2.position.y, a)
        },
        rotation: lerp(state1.rotation, state2.rotation, a),
        scale: {
            x: lerp(state1.scale.y, state2.scale.y, a),
            y: lerp(state1.scale.y, state2.scale.y, a)
        },
        width: lerp(state1.width, state2.width, a),
        height: lerp(state1.height, state2.height, a),
    }
}

async function transitionState(scene, source, fromState, toState, easingFunc, length) {
    const oldState = fromState;
    const newState = toState;

    OBS.setSceneItemProperties(scene, source, oldState);

    let lastTick = 0;
    let t = 0;

    const int = setInterval(() => {
        const delta = Date.now() - lastTick;

        if (lastTick && t < 1) {
            t += (delta / 1000) / length;

            const v = easingFunc(t);

            const interpState = interpolateState(v, oldState, newState);
            OBS.setSceneItemProperties(scene, source, interpState);
        } else if(lastTick) {
            clearInterval(int);
        }

        lastTick = Date.now();
    }, 1000 / 60);
}

class Transitions {

    static async getState(sourceName) {
        return OBS.getSceneItemProperties({ name: sourceName });
    }

    static async transitionSource(scene, source, fromState, toState, easingFunc, len) {
        transitionState(scene, source, fromState, toState, easingFunc, len);
    }

}

let presets = Config.get('layout-presets') || [];

class LayoutPresets {

    static getPresets() {
        return presets;
    }

    static async playPreset(preset, easing, length) {
        const easingFunc = Easing[easing];

        for(let source of preset.slice(1)) {
            Transitions.getState(source.name).then(state => {
                Transitions.transitionSource(state.currentScene, source.name, state, source, easingFunc, length);
            }).catch(err => {
                console.log('Error transitioning source, ', err);
            });
        }
    }

    static async getSceneSourcesStates() {
        const state = OBS.getState();
        const currentScene = state.currentScene;
        const scene = state.scenes.find(s => s.name == currentScene);
        const sources = scene.sources;
        const transforms = sources.map(({ name }) => {
            return Transitions.getState(name).then(source => {
                source.scene = scene.name;
                return source;
            });
        });
        return Promise.all(transforms);
    }
    
    static async saveNewPreset() {
        const sceneTransforms = await this.getSceneSourcesStates();
        sceneTransforms.unshift("Layout Preset " + (presets.length + 1));
        presets.push(sceneTransforms);
        this.savePresets();
    }
    
    static savePresets() {
        Config.set('layout-presets', presets);
    }
    
    static deletePreset(index) {
        presets.splice(index, 1);
        this.savePresets();
    }

}

function map(value, in_min, in_max, out_min, out_max) {
	return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

class FluidInput extends LitElement {

    static get styles() {
        return css`
            :host {
                display: inline-block;
                height: 25px;
                width: 85px;

                --color-input-background: #1B1B1B;
                --color-input-hover-background: #202020;
                --color-input-active-background: #373737;
            }

            .input-container {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: var(--color-input-background);
                border-radius: 4px;
                cursor: e-resize;
                position: relative;
                overflow: hidden;
                border: 1px solid #373737;
            }

            .input-container:before {
                content: "";
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                width: calc(100% * var(--value));
                pointer-events: none;
                background: white;
                opacity: 0.025;
            }

            .input-container[active]:before {
                opacity: 0.1;
            }

            .input-container:hover {
                background: var(--color-input-hover-background);
            }
            
            .input-container[active] {
                background: var(--color-input-active-background);
            }

            .value-container {
                white-space: nowrap;
                height: 100%;
            }

            .input-value {
                cursor: e-resize;
                height: 100%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: transparent;
                margin: 0 -10px;
                width: auto;
                padding: 0;
                color: inherit;
                font-family: inherit;
                font-size: inherit;
                text-align: center;
            }

            .input-value:focus {
                cursor: text;
            }

            .value-suffix {
                opacity: 0.5;
                pointer-events: none;
                margin-left: 5px;
            }

            .input-value:focus {
                outline: none;
                cursor: text;
            }

            .arrow {
                padding: 0 6px;
                height: 100%;
                display: flex;
                align-items: center;
                cursor: pointer;
                opacity: 0.75;
                position: absolute;
            }

            .left-arrow {
                left: 0;
            }
            .right-arrow {
                right: 0;
            }

            .arrow:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            .arrow:active {
                background: rgba(255, 255, 255, 0.01);
            }

            .arrow svg {
                fill: none;
                stroke: var(--color-text, #eee);
                stroke-width: 1.25px;
                stroke-linecap: round;
            }
        `;
    }

	render() {
		return html`
			<div class="input-container">
                <span class="arrow left-arrow">
                    <svg x="0px" y="0px" width="7.3px" height="11px" viewBox="0 0 7.3 12.5">
                        <polyline class="st0" points="6.3,1 1,6.3 6.3,11.5 "/>
                    </svg>
                </span>
                <span class="value-container">
                    <input class="input-value"></input>
                    ${this.suffix ? html`
                        <span class="value-suffix">${this.suffix}</span>
                    ` : "" }
                </span>
                <span class="arrow right-arrow">
                    <svg x="0px" y="0px" width="7.3px" height="11px" viewBox="0 0 7.3 12.5">
                        <polyline class="st0" points="1,11.5 6.3,6.3 1,1 "/>
                    </svg>
                </span>
			</div>
		`;
	}

    static get properties() {
        return {
            value: {},
            min: {},
            max: {},
            steps: {},
        };
    }

	get value() { return this._value; }
	set value(val) { 
		this._value = +val;
		this.update();
	}

	get min() { return this._min; }
	set min(val) {
		this._min = +val;
		this.update();
	}

	get max() { return this._max; }
	set max(val) {
		this._max = +val;
		this.update();
	}

	get steps() { return this._steps; }
	set steps(val) {
		this._steps = +val;
		this.update();
    }

	get suffix() { return this.getAttribute('suffix'); }
	set suffix(val) { this.setAttribute('suffix', val); }
    
    get isRange() {
        return this.max || this.min;
    }

	constructor() {
		super();

		this._value = .2;
		this._min = 0;
		this._max = 0;
		this._steps = 0.1;

        this.update();

		this.input = this.shadowRoot.querySelector('.input-container');
        this.inputValue = this.shadowRoot.querySelector('.input-value');

		this.leftArrow = this.shadowRoot.querySelector('.left-arrow');
		this.rightArrow = this.shadowRoot.querySelector('.right-arrow');

		this.registerHandlers();
	}

	registerHandlers() {
		let startPos = null;
		let startMovePos = null;
        let startValue = this.value;
        let focused = false;

		const cancel = () => {
            startPos = null;
            startMovePos = null;
            this.input.removeAttribute('active');
		};
		const up = e => {
            if(startPos && !startMovePos) {
                this.inputValue.disabled = false;
                focused = true;

                this.inputValue.focus();
            }
			cancel();
		};
		const start = e => {
			if(!focused) {
                startPos = [e.x, e.y];
                startValue = this.value;
                this.input.setAttribute('active', ''); 
                e.preventDefault();
            }
		};
		const move = e => {
			if(startPos) {
                if(Math.abs(e.x - startPos[0]) > 10) {
                    startMovePos = [e.x, e.y];
                }
            }
			if(startMovePos && startPos) {
				// apply shift key scaler
				let scale = e.shiftKey ? 0.0005 : 0.005;
                // scale to min max range
                if(this.max - this.min > 0) {
                    scale *= (this.max - this.min) / 4;
                }

				// set value by absolute delta movement * scale
				let absolute = startValue + ((e.x - startPos[0]) * scale);
				// apply steps
				absolute = absolute - (absolute % this.steps);

				this.setValue(absolute);
				e.preventDefault();
			}
        };

        const submit = () => {
            if(isNaN(this.inputValue.value)) {

                try {
                    const evalValue = math.evaluate(this.inputValue.value);
                    this.setValue(evalValue);
                } catch(err) {
                    console.log(err);
                }
                
                cancelInput();

            } else {
                this.setValue(parseFloat(this.inputValue.value));
                this.inputValue.disabled = true;
                focused = false;
            }
        };

        const cancelInput = () => {
            this.setValue(this.value);
            this.inputValue.disabled = true;
            focused = false;
        };

        const input = e => {
            if(e.key == "Enter") {
                submit();
            } else if(e.key == "Escape") {
                cancelInput();
            }
        };
        
        this.inputValue.addEventListener('blur', submit);
        this.inputValue.addEventListener('keydown', input);

		this.input.addEventListener('mousedown', start);
		window.addEventListener('mousemove', move);

		window.addEventListener('mouseup', up);
		window.addEventListener('mousecancel', cancel);
        window.addEventListener('mouseleave', cancel);
        
        this.leftArrow.addEventListener('click', e => {
            this.setValue(this.value - this.steps);
            e.preventDefault();
        });
        this.rightArrow.addEventListener('click', e => {
            this.setValue(this.value + this.steps);
            e.preventDefault();
        });

        this.addEventListener('mousedown', e => {
            if(!startPos && !focused) {
                e.preventDefault();
            }
        });
	}

	attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);

		if(name == "value") {
			this.setValue(newValue);
		}
		if(name == "min") {
			this.min = +newValue;
		}
		if(name == "max") {
			this.max = +newValue;
		}
		if(name == "steps") {
			this.steps = +newValue;
		}
	}

	update(args) {
        super.update(args);

        if(!this.inputValue) {
            return;
        }

        if(this.isRange) {
            this.input.style.setProperty('--value', map(this.value, this.min, this.max, 0, 1));
        }

        const getPrecision = (n) => {
            const precParts = n.toString().split(".");
            const size = precParts[1] ? precParts[1].length : 0;

            // return 0 if precision is smaller then .000
            if(precParts[1] && precParts[1].substring(0, 3) == "000") {
                return 0;
            }

            return size;
        };

        const valuePrecision = getPrecision(this.value);
        const stepsPrecision = getPrecision(this.steps);

        const precision = valuePrecision > stepsPrecision ? stepsPrecision : valuePrecision;

        this.inputValue.value = this.value.toFixed(precision);
        this.inputValue.size = this.inputValue.value.length;
	}

	setValue(value) {
        const lastVal = this.value;

        if(this.isRange) {
            this.value = Math.min(Math.max(value, this.min), this.max);
        } else {
            this.value = value;
        }

        this.dispatchEvent(new InputChangeEvent(this.value - lastVal, this.value));
	}

}

class InputChangeEvent extends Event {
    constructor(delta, value) {
        super('change');
        this.delta = delta;
        this.value = value;
    }
}

customElements.define("gyro-fluid-input", FluidInput);

class DropdownButton extends LitElement {

    static get properties() {
        return {
            value: {},
        };
    }

	static get styles() {
		return css`
			:host {
				display: block;
				position: relative;
				outline: none;
				color: white;
				font-family: sans-serif;
				font-size: 12px;
				text-transform: capitalize;
				min-width: 120px;
				box-sizing: border-box;
			}

			:host(:focus) {
				background: rgba(52, 52, 52, 0.75);
			}

			:host {
				width: auto;
				line-height: 15px;
				cursor: pointer;
				padding: 6px 12px;
				border-radius: 4px;
				box-sizing: content-box;
				background: rgba(15, 15, 15, 0.5);
				border: 1px solid #373737;
			}

			:host(:hover) {
				background: rgba(52, 52, 52, 0.75);
			}

			:host([active]) {
				z-index: 1000;
			}

			:host([active]) .options {
				display: block;
				animation: show .06s ease-out;
			}

			.options {
				display: none;
				position: absolute;
				top: 100%;
				margin-top: 2px;
				right: 0;
				background: rgba(25, 25, 25, 1);
				border-radius: 4px;
				overflow: hidden;
				min-width: 100%;
				width: max-content;
				animation: hide .06s ease-out both;
			}

			.options span {
				padding: 5px 8px;
				display: block;
				cursor: pointer;
			}

			.options span:hover {
				background: rgba(100, 100, 100, 0.75);
			}

			.options span:active {
				filter: brightness(0.9);
			}

			.value {
				max-width: 100px;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			}

			.value::after {
				content: url("data:image/svg+xml,%3C!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In --%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:a='http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/' x='0px' y='0px' width='7px' height='5.8px' viewBox='0 0 7 5.8' style='enable-background:new 0 0 7 5.8;' xml:space='preserve'%3E%3Cstyle type='text/css'%3E .st0%7Bfill:%23FFFFFF;%7D%0A%3C/style%3E%3Cdefs%3E%3C/defs%3E%3Cpolygon class='st0' points='0,0 3.5,5.8 7,0 '/%3E%3C/svg%3E%0A");
				position: absolute;
				right: 10px;
				top: 50%;
				transform: translateY(-55%);
			}

			:host([active]) .value::after {
				transform: translateY(-50%) rotate(180deg);
			}

			@keyframes show {
				from {
					clip-path: polygon(100% 0, 0 0, 0 0, 100% 0);
				}
				to {
					clip-path: polygon(100% 0, 0 0, 0 100%, 100% 100%);
				}
			}
			@keyframes hide {
				from {
					clip-path: polygon(100% 0, 0 0, 0 100%, 100% 100%);
				}
				to {
					clip-path: polygon(100% 0, 0 0, 0 0, 100% 0);
				}
			}
		`;
	}
	
	render() {
		const options = this.props.options || [];
		const onSelect = this.props.onSelect;
		const value = this.props.value != null ? (this.props.value.name || "none") : "none";

		return html`
			<div class="value">
				${value}
			</div>
			<div class="options">
				${options.map(opt => {
					return html`<span @click=${() => onSelect(opt)}>${opt.name}</span>`;
				})}
			</div>
		`;
	}

	get value() {
		return this.props.value;
	}

	set value(val) {
		this.props.value = val;

		for(let option of this.options) {
			if(option.value == val) {
				this.props.value = option;
			}
		}

		this.update();
	}

	get options() {
		return this.props.options || [];
	}

	set options(arr) {
		this.props.options = arr;
		this.props.value = this.props.value ? this.props.value : arr[0] ? arr[0] : { name: "none" };
		this.dispatchEvent(new Event('change'));
		this.update();
		this.blur();
	}

	constructor(props = {}) {
		super();

        this.props = props;

		this.props.onSelect = opt => {
			this.value = opt;
			this.dispatchEvent(new Event('change'));
			this.update();
			this.blur();
		};
	}

	connectedCallback() {
		super.connectedCallback();
		this.tabIndex = 0;

		this.addEventListener('focus', e => {
			this.setAttribute('active', '');
		});

		this.addEventListener('blur', e => {
			this.removeAttribute('active');
		});

		if(this.options && this.options.length < 1) {
			const childOptions = [];
			for(let child of this.children) {
				childOptions.push({
					name: child.getAttribute('name'),
					value: child.getAttribute('value'),
				});
			}
			this.options = childOptions;
		}
	}

}

customElements.define("dropdown-button", DropdownButton);

class ScenePresets extends DockTab {

    constructor() {
        super();

        this.easingSelect = document.createElement('dropdown-button');
        this.easingSelect.options = Object.keys(Easing).reverse().map(key => {
            return { name: key, value: key }
        });
        const savedValue = Config.get('preset-easing-curve');
        if(savedValue) {
            this.easingSelect.value = savedValue;
        }
        this.easingSelect.addEventListener('change', e => {
            Config.set('preset-easing-curve', this.easingSelect.value);
        });

        this.transitionLengthInput = document.createElement('gyro-fluid-input');
        this.transitionLengthInput.suffix = "s";
        this.transitionLengthInput.value = Config.get('preset-transition-length') || 1;
        this.transitionLengthInput.min = 0;
        this.transitionLengthInput.max = 10;
        this.transitionLengthInput.steps = 0.1;
        this.transitionLengthInput.onchange = () => {
            Config.set('preset-transition-length', this.transitionLengthInput.value);
        };
    }

    static get styles() {
        return css`
            ${super.styles}
            input, textarea {
                font-size: 16px;
                display: inline-block;
                width: 100%;
                box-sizing: border-box;
                text-align: left;
            }
            textarea {
                min-height: 100px;
                font-size: 14px;
            }
            .section {
                margin: 0 0 10px 0;
            }
            p {
                opacity: 0.75;
                margin-top: 0;
                font-size: 12px;
            }
            gyro-fluid-input {
                min-width: 130px;
            }
            dropdown-button {
                min-width: 130px;
                box-sizing: border-box;
            }
            .layout-preset-list {
                margin-bottom: 20px;
                border-radius: 4px;
                padding: 1px;
            }
            .layout-preset-item {
                display: grid;
                grid-template-columns: auto 1fr auto;
                align-items: center;
                height: 32px;
                position: relative;
            }
            .layout-preset-item:hover {
                background: rgba(255, 255, 255, 0.025);
            }
            .layout-preset-item:not(:last-child) {
                border-bottom: 1px solid #1a1a1a;
            }
            i.material-icons {
                font-size: 16px;
            }
            .item-button {
                cursor: pointer;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35px;
                border-radius: 4px;
            }
            .item-button:hover {
                background: #363636;
                box-shadow: 1px 2px 8px rgba(0, 0, 0, 0.2);
            }
            .item-button:active {
                background: #272727;
                box-shadow: none;
            }
            .preset-name {
                opacity: 0.75;
                margin-left: 12px;
            }
            input {
                font-size: inherit;
            }
            input[disabled] {
                border: 1px solid transparent;
                background: transparent;
            }
            obs-dock-tab-section {
                display: grid;
                grid-template-rows: auto 1fr;
            }
        `;
    }

    render() {
        const presets = LayoutPresets.getPresets();

        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Controls">
                <div class="row">
                    <label>Transition Time</label>
                    ${this.transitionLengthInput}
                </div>
                
                <div class="row">
                    <label>Transition Curve</label>
                    ${this.easingSelect}
                </div>
            </obs-dock-tab-section>

            <obs-dock-tab-section section-title="Scene Layout Presets">
                
                <div class="layout-preset-list">
                    ${presets.map((preset, i) => {
                        return html`
                            <div class="layout-preset-item">
                                <div class="item-button" @click="${() => {
                                    LayoutPresets.playPreset(preset, this.easingSelect.value.value, this.transitionLengthInput.value);
                                }}">
                                    <i class="material-icons">play_arrow</i>
                                </div>
                                <div class="preset-name" @dblclick="${e => {
                                        const target = e.target;
                                        target.removeAttribute('disabled');
                                        target.focus();
                                        target.select();
                                    }}">
                                    <input value="${preset[0]}" disabled @blur="${e => {
                                        e.target.setAttribute('disabled', '');
                                        window.getSelection().empty();
                                    }}" @input="${e => {
                                        preset[0] = e.target.value;
                                        LayoutPresets.savePresets();
                                    }}" @keydown="${e => {
                                        if(e.key == "Enter") {
                                            e.target.setAttribute('disabled', '');
                                            window.getSelection().empty();
                                        }
                                    }}"/>
                                </div>
                                <div class="item-button" @click="${e => {
                                    LayoutPresets.deletePreset(i);
                                    this.update();
                                }}">
                                    <i class="material-icons" style="opacity: 0.5;">delete</i>
                                </div>
                            </div>
                        `;
                    })}
                </div>

                <button @click="${async () => {
                    try {
                        await LayoutPresets.saveNewPreset();
                    } catch(err) {
                        console.error(err);
                    }
                    this.update();
                }}">Create new Preset</button>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-scene-presets', ScenePresets);

function getGamepads() {
    return navigator.getGamepads();
}

class GamepadButtonDownEvent extends GamepadEvent {
    constructor(gamepad, button) {
        super("buttondown", { gamepad });

        this.button = button;
    }
}

class GamepadButtonUpEvent extends GamepadEvent {
    constructor(gamepad, button) {
        super("buttonup", { gamepad });
        
        this.button = button;
    }
}

function init() {

    window.addEventListener("gamepadconnected", e => {
        const pad = e.gamepad;
        poll(pad);
    });

    let lastState = [];

    const poll = (gamepad) => {
        const buttons = gamepad.buttons;

        const currentState = {
            buttons: buttons
        };

        if(lastState[gamepad.index]) {
            for(let i = 0; i < currentState.buttons.length; i++) {
                const btn = currentState.buttons[i];
                btn.id = i;
                
                const value = btn.value;
                const lastValue = lastState[gamepad.index].buttons[i].value;
                
                if(value !== lastValue) {
                    if(value > 0) {
                        window.dispatchEvent(new GamepadButtonDownEvent(gamepad, btn));
                    } else {
                        window.dispatchEvent(new GamepadButtonUpEvent(gamepad, btn));
                    }
                }
            }
        }

        lastState[gamepad.index] = currentState;
    };

    const pollLoop = () => {
        for (let gamepad of getGamepads()) {
            if(gamepad != null) {
                poll(gamepad);
            }
        }
        requestAnimationFrame(pollLoop);
    };

    pollLoop();
}

init();

var Mapping = {
    JoyConR: {
        "A": 0,
        "B": 2,
        "Y": 3,
        "X": 1,
        "+": 9,
        "R": 8,
        "RZ": 7,
        "Home": 16,
        "SL": 4,
        "SR": 5,
        "RS": 10,
    }
};

class Controler extends DockTab {

    static get styles() {
        return css`
            ${super.styles}

            @keyframes slide-in {
                from { transform: translateY(-10px); opacity: 0; }
            }
            
            .gamepad, .no-gamepad {
                margin: 8px;
                padding: 8px;
                border-radius: 3px;
                background: #333;
                font-size: 12px;
                animation: slide-in .5s ease;
            }

            .no-gamepad {
                opacity: 0.5;
            }

            .gamepad-id {
                max-width: calc(100% - 70px);
                white-space: nowrap;
                display: inline-block;
                margin-right: 5px;
                text-overflow: ellipsis;
            }

            span {
                display: inline-block;
                overflow: hidden;
                vertical-align: middle;
            }

            .mapping {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
        `;
    }

    history = [];
    gamepad = null;
    mapping = Mapping.JoyConR;
    buttonMap = {
        "A": {
            setCurrentScene: "Szene"
        },
        "B": {
            setCurrentScene: "Scene 2"
        },
    };

    constructor() {
        super();

        window.addEventListener("gamepadconnected", ({ gamepad }) => {
            this.gamepad = gamepad;
            this.update();
        });
        window.addEventListener("gamepaddisconnected", ({ gamepad }) => {
            if(this.gamepad.id == gamepad.id) {
                this.gamepad = null;
                this.update();
            }
        });
        
        window.addEventListener("buttondown", async e => {
            for(let label in this.mapping) {
                if(this.mapping[label] == e.button.id) {
                    const mappedTo = this.buttonMap[label];

                    for(let fn in mappedTo) {
                        OBS$1[fn](mappedTo[fn]);
                    }

                    this.update();
                    break;
                }
            }
        });
    }

    render() {
        return html`
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

            ${this.gamepad != null ? html`
                <div class="gamepad">
                    <span class="gamepad-id">${this.gamepad.id}</span>
                    <span>connected</span>
                </div>
            ` : html`
                <div class="no-gamepad">
                    <span>No controller connected</span>
                </div>
            `}

            <obs-dock-tab-section section-title="Button Mapping">
                ${Object.keys(this.buttonMap).map(btn => {
                    return html`
                        <div class="mapping">
                            <div>
                                <span>
                                    ${btn}
                                </span>
                                <span>
                                    ---->
                                </span>
                                <span>
                                    ${JSON.stringify(this.buttonMap[btn])}
                                </span>
                            </div>

                            <button @click="${e => {
                                delete this.buttonMap[btn];
                                this.update();
                            }}">X</button>
                        </div>
                    `;
                })}
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('obs-controler', Controler);

class OverlayProperties extends DockTab {

    static get styles() {
        return css`
            ${super.styles}
            
        `;
    }

    constructor() {
        super();

        this.selection = [];

        OBS.on('selection', e => {
            switch (e.updateType) {
                case "SceneItemDeselected":
                    let index = 0;
                    for(let item of this.selection) {
                        if(item.itemId == e.itemId) {
                            this.selection.splice(index, 1);
                            break;
                        }
                        index++;
                    }
                    break;
                case "SceneItemSelected":
                    this.selection.push({
                        itemId: e.itemId,
                        itemName: e.itemName,
                    });
                    break;
            }
            this.update();
            this.handleSelection(this.selection);
        });
    }

    handleSelection(selection) {
        console.log(selection);
        for(let item of selection) {
            OBS.getSourceSettings(item).then(settings => {
                console.log(settings);
            });

            const bc = new BroadcastChannel('obs-tool-com');
            bc.postMessage({ type:'getProperties' });

            bc.onmessage = ev => {
                console.log(ev);
                // get properties
                // render ui
                // send changes to overlay
            };
        }
    }

    render() {
        return html`
            <link href="./material-icons.css" rel="stylesheet">

            <obs-dock-tab-section section-title="Overlay Properties">
                <div>
                    ${this.selection.map(item => {
                        return html`
                            <div>
                                ${JSON.stringify(item)}
                            </div>
                        `;
                    })}
                </div>
            </obs-dock-tab-section>
        `;
    }
}

customElements.define('overlay-properties', OverlayProperties);

class Streamlabs {

    static get connected() {
        return this.socket ? this.socket.connected : false;
    }

    static on(event, callback) {
        const listeners = this.listeners;
        listeners[event] = listeners[event] ? listeners[event] : [];
        listeners[event].push(callback);
    }

    static emit(event, msg) {
        const listeners = this.listeners;
        if(listeners[event]) {
            for(let callback of listeners[event]) callback(msg);
        }
    }

    static disconnect() {
        this.socket.disconnect();
    }

    static async connect() {
        return new Promise(async (resolve, reject) => {
            if(!this.socket) {
                const access_token = Config.get('streamlabs-websocket-token');
                const service = `https://sockets.streamlabs.com?token=${access_token}`;

                this.socket = io(service, { transports: ['websocket'] });
    
                this.socket.on('event', (event) => {
                    const events = ['raid', 'follow', 'donation', 'host', 'subscription', 'resub'];

                    if(events.includes(event.type)) {
                        for(let message of event.message) {
                            message.type = event.type;
                            this.emit(event.type, message);
                        }
                    }
                });

                this.socket.on('connect', () => {
                    console.log('connected');
                    resolve(this.connected);
                });

            } else {
                reject();
            }
        }).catch(err => {
            if(err) console.error(err);
        })
    }

}

Config.on('streamlabs-websocket-token', e => {
    console.log(e);
    Streamlabs.connect();
});

Streamlabs.connect();

Streamlabs.socket = null;
Streamlabs.listeners = {};

const labelData = Config.get('labels') || {};

Streamlabs.on('subscription', handleSub);
Streamlabs.on('resub', handleSub);
Streamlabs.on('donation', handleDonation);

function handleSub(data) {
    labelData.lastSubscriber = data;
    saveLabels();
}

function handleDonation(data) {
    const amount = +data.formatted_amount.replace(/[\€|\$]/g, '');

    let topAmount = 0;
    if(labelData.topDonation) {
        topAmount = +labelData.topDonation.formatted_amount.replace(/[\€|\$]/g, '');
        if(amount > topAmount) {
            labelData.topDonation = data;
        }
    } else {
        labelData.topDonation = data;
    }
    
    labelData.lastDonation = data;
    saveLabels();
}

function saveLabels() {
    console.debug(labelData);
    Config.set('labels', labelData);
    emitChange();
}

const listeners = [];

function emitChange() {
    for(let callback of listeners) {
        callback();
    }
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

window.addEventListener('contextmenu', e => e.preventDefault());

const uid = localStorage.getItem('unique-client-id');
if (!uid) {
    localStorage.setItem('unique-client-id', uuidv4());
}
