export const COLOR_OPTIONS = [
  { key: 'green', label: '绿色', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', block: 'bg-green-50 border-green-200' },
  { key: 'blue', label: '蓝色', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', block: 'bg-blue-50 border-blue-200' },
  { key: 'orange', label: '橙色', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', block: 'bg-orange-50 border-orange-200' },
  { key: 'pink', label: '粉色', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', block: 'bg-pink-50 border-pink-200' },
  { key: 'purple', label: '紫色', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', block: 'bg-purple-50 border-purple-200' },
  { key: 'teal', label: '青色', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', block: 'bg-teal-50 border-teal-200' },
]

export function getColor(colorKey: string) {
  return COLOR_OPTIONS.find(c => c.key === colorKey) || COLOR_OPTIONS[0]
}
