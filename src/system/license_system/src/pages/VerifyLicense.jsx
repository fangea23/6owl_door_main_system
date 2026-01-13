import { useState } from 'react'
import { Shield, Check, X, Key, Monitor, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { licenseApi } from '../lib/supabase'
import { getLicenseTypeLabel, getLicenseTypeColor, formatDate } from '../utils/helpers'

export function VerifyLicense() {
  const [licenseKey, setLicenseKey] = useState('')
  const [machineId, setMachineId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await licenseApi.verify(licenseKey, machineId || 'web-verify')
      setResult(response)
    } catch (err) {
      setError(err.message || '驗證失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">授權驗證</h1>
          <p className="text-gray-500 mt-2">驗證您的軟體授權碼</p>
        </div>

        {/* Verify Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="輸入授權碼 (例如: XXXX-XXXX-XXXX-XXXX)"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  required
                  className="pl-10 font-mono"
                />
              </div>

              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="機器識別碼 (選填)"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                驗證授權
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className={result.valid ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.valid ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-green-600">授權有效</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-red-600" />
                    <span className="text-red-600">授權無效</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.valid ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">產品</p>
                      <p className="font-medium">{result.product_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">版本</p>
                      <p className="font-medium">{result.product_version || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">授權類型</p>
                      <Badge className={getLicenseTypeColor(result.license_type)}>
                        {getLicenseTypeLabel(result.license_type)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">到期日</p>
                      <p className="font-medium">
                        {result.expires_at ? formatDate(result.expires_at) : '永久'}
                      </p>
                    </div>
                  </div>
                  {result.new_activation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                      <Info className="inline h-4 w-4 mr-1" />
                      此機器已成功啟用
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700">{result.message}</p>
                  <p className="text-sm text-gray-500">錯誤碼: {result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">API 整合</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              您可以使用以下 API 在您的軟體中驗證授權碼：
            </p>
            <div className="bg-gray-900 rounded-lg p-4 text-sm">
              <code className="text-green-400">
                POST /rest/v1/rpc/verify_license
              </code>
              <pre className="text-gray-300 mt-2 overflow-x-auto">
{`{
  "p_license_key": "XXXX-XXXX-XXXX-XXXX",
  "p_machine_id": "unique-machine-id",
  "p_machine_name": "User's Computer"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
