/**
 * Global DOM Patch for React Reconciliation Protection
 * 
 * Previne erros de desincronização entre o Virtual DOM do React e o DOM real do navegador:
 * "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node."
 * 
 * Causa principal:
 * Extensões do navegador (especialmente Google Tradutor, tradução automática do Chrome,
 * corretores ortográficos ou scripts externos como os do Vercel/YouTube)
 * manipulam nós de texto ou alteram os pais dos elementos sem o React saber.
 * 
 * Este patch intercepta de forma segura chamadas a insertBefore e removeChild
 * para garantir que o React nunca quebre caso um nó de referência tenha sido reparentado.
 */
export function initDomProtection() {
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;

  // Evita re-aplicar o patch múltiplas vezes
  if ((window as any).__REACT_DOM_PATCH_APPLIED__) return;
  (window as any).__REACT_DOM_PATCH_APPLIED__ = true;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Se o nó de referência não for filho deste nó (por ex., foi envolvido em <font> ou movido),
      // faz appendChild de forma graciosa e segura em vez de disparar DOMException no navegador
      return this.appendChild(newNode) as T;
    }
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch {
      return this.appendChild(newNode) as T;
    }
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      // Se o nó filho já não pertence a este pai, apenas retorna o nó sem quebrar a execução
      return child;
    }
    try {
      return originalRemoveChild.call(this, child) as T;
    } catch {
      return child;
    }
  };
}
