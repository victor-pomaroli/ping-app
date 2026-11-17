package expo.modules.pingappicon

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Troca o ícone do app entre os activity-alias criados pelo plugin with-ping-app-icons
 * (um por personalidade). Só um alias fica habilitado; o padrão é "debochado".
 */
class PingAppIconModule : Module() {
  private val keys = listOf("debochado", "deboa", "sempaciencia")
  private val defaultKey = "debochado"

  private fun component(key: String): ComponentName {
    val context = appContext.reactContext ?: throw IllegalStateException("Contexto do app indisponível")
    return ComponentName(context.packageName, "${context.packageName}.PingIcon_$key")
  }

  private fun isEnabled(pm: PackageManager, key: String): Boolean =
    when (pm.getComponentEnabledSetting(component(key))) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      PackageManager.COMPONENT_ENABLED_STATE_DISABLED -> false
      else -> key == defaultKey
    }

  override fun definition() = ModuleDefinition {
    Name("PingAppIcon")

    Function("getIcon") {
      val context = appContext.reactContext ?: throw IllegalStateException("Contexto do app indisponível")
      keys.firstOrNull { isEnabled(context.packageManager, it) } ?: defaultKey
    }

    Function("setIcon") { key: String ->
      if (!keys.contains(key)) throw IllegalArgumentException("Ícone desconhecido: $key")
      val context = appContext.reactContext ?: throw IllegalStateException("Contexto do app indisponível")
      val pm = context.packageManager
      // Habilita o novo primeiro para nunca ficar sem ícone de abertura; DONT_KILL_APP mantém o app aberto.
      pm.setComponentEnabledSetting(component(key), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      for (other in keys) {
        if (other != key) {
          pm.setComponentEnabledSetting(component(other), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
        }
      }
    }
  }
}
