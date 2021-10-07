import styles from './styles.module.scss'
import { WFAIRAddress } from '../../config/config'
import MetaMaskIcon from '../../data/icons/wallet/metamask.svg'
import PlusIcon from '../../data/icons/plus.svg'

const AddTokens = ({ onFutherClick }) => {
  return (
    <div className={styles.buttonWrapper}>
      <button
        className={styles.addToken}
        onClick={async () => {
          if (onFutherClick && typeof onFutherClick === 'function') {
            onFutherClick()
          }

          const { ethereum } = window
          await ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: WFAIRAddress,
                symbol: 'WFAIR',
                decimals: 18,
                image: 'https://main.wallfair.io/logo192.png'
              }
            }
          })
        }}
      >
        <img src={MetaMaskIcon} alt={`MetaMask`} />
        <img src={PlusIcon} alt={`Plus`} />
        <img src='https://main.wallfair.io/logo192.png' alt={`WallFair.`} />
      </button>
    </div>
  )
}
export default AddTokens
