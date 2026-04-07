/**
 * ModalManager — bus listener that opens/closes modals by id.
 * Listens for ui:open-modal { modalId } and ui:close-modal { modalId }.
 * OWNED BY: ui-agent
 */
import { bus }                            from '../../utils/EventBus.js'
import { getModal, hasModal, registerModal } from './modalRegistry.js'
import { WoodcuttingModal }               from './skills/WoodcuttingModal.js'
import { MiningModal }                   from './skills/MiningModal.js'

export class ModalManager {
  constructor() {
    // Instantiate and register all modals here
    registerModal('woodcutting', new WoodcuttingModal())
    registerModal('mining',      new MiningModal())

    bus.on('ui:open-modal',  ({ modalId }) => {
      if (hasModal(modalId)) getModal(modalId).show()
    })
    bus.on('ui:close-modal', ({ modalId }) => {
      if (hasModal(modalId)) getModal(modalId).hide()
    })
  }
}
