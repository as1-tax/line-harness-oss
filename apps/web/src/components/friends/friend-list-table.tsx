'use client'

import { useState } from 'react'
import type { Tag, StaffMember } from '@line-crm/shared'
import type { FriendListItem } from '@/lib/api'
import { api } from '@/lib/api'
import FriendListRow from './friend-list-row'
import TagBadge from './tag-badge'

interface Props {
  friends: FriendListItem[]
  allTags: Tag[]
  onRefresh: () => void
  currentRole: string
  staffList: StaffMember[]
}

export default function FriendListTable({ friends, allTags, onRefresh, currentRole, staffList }: Props) {
  // Inline tag-management expander. The row's primary click navigates to
  // /chats; tag editing stays available here as a secondary action because
  // the chats page's FriendInfoSidebar currently only displays tags (no
  // add/remove). Without this expander operators would lose the only path
  // to mutate friend tags from the admin UI.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingTagForFriend, setAddingTagForFriend] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 担当者割り当て用の一時選択値（expandedId ごとに管理）
  const [assignPrimary, setAssignPrimary] = useState<string>('')
  const [assignSecondary, setAssignSecondary] = useState<string>('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState('')

  // 管理名編集
  const [managementNameValues, setManagementNameValues] = useState<Record<string, string>>({})
  const [managementNameSaving, setManagementNameSaving] = useState(false)
  const [managementNameError, setManagementNameError] = useState('')

  const toggleExpand = (id: string, friend?: FriendListItem) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    setAddingTagForFriend(null)
    setSelectedTagId('')
    setError('')
    // 展開時に現在の担当者・管理名をフォームの初期値にセット
    if (next && friend) {
      setAssignPrimary(friend.primaryStaff?.id ?? '')
      setAssignSecondary(friend.secondaryStaff?.id ?? '')
      setManagementNameValues(v => ({ ...v, [id]: friend.managementName ?? '' }))
    }
    setAssignError('')
    setManagementNameError('')
  }

  const handleSaveManagementName = async (friendId: string) => {
    setManagementNameSaving(true)
    setManagementNameError('')
    try {
      await api.friends.updateManagementName(friendId, managementNameValues[friendId] || null)
      onRefresh()
    } catch {
      setManagementNameError('管理名の保存に失敗しました')
    } finally {
      setManagementNameSaving(false)
    }
  }

  const handleAssign = async (friendId: string) => {
    setAssignLoading(true)
    setAssignError('')
    try {
      await api.friends.assign(friendId, {
        primaryStaffId: assignPrimary || null,
        secondaryStaffId: assignSecondary || null,
      })
      onRefresh()
    } catch {
      setAssignError('担当者の保存に失敗しました')
    } finally {
      setAssignLoading(false)
    }
  }

  const handleAddTag = async (friendId: string) => {
    if (!selectedTagId) return
    setLoading(true)
    setError('')
    try {
      await api.friends.addTag(friendId, selectedTagId)
      setAddingTagForFriend(null)
      setSelectedTagId('')
      onRefresh()
    } catch {
      setError('タグの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (friendId: string, tagId: string) => {
    setLoading(true)
    setError('')
    try {
      await api.friends.removeTag(friendId, tagId)
      onRefresh()
    } catch {
      setError('タグの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (friends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">友だちが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header sits inside the same overflow container as the body so the
          column labels stay aligned with their values when the user scrolls
          horizontally on narrower viewports (e.g. desktop with sidebar open
          and the body forced to min-w-[900px]). */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="hidden lg:grid grid-cols-[80px_220px_120px_140px_1fr_280px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div>対応マーク</div>
            <div>名前</div>
            <div>シナリオ</div>
            <div>担当者</div>
            <div>受信メッセージ</div>
            <div>★つきタグ・友だち情報</div>
          </div>
          {friends.map((friend) => {
            const isExpanded = expandedId === friend.id
            const isAddingTag = addingTagForFriend === friend.id
            const availableTags = allTags.filter(
              (t) => !friend.tags.some((ft) => ft.id === t.id),
            )

            return (
              <div key={friend.id}>
                <FriendListRow
                  friend={friend}
                  currentRole={currentRole}
                  onTagEditClick={() => toggleExpand(friend.id, friend)}
                />

                {isExpanded && (
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">LINE ユーザーID</p>
                      <p className="text-xs text-gray-600 font-mono break-all select-all">{friend.lineUserId}</p>
                    </div>

                    {/* 管理名（アクセス可能なスタッフ全員が編集可） */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">管理名</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={managementNameValues[friend.id] ?? ''}
                          onChange={(e) => setManagementNameValues(v => ({ ...v, [friend.id]: e.target.value }))}
                          placeholder="株式会社○○ 山田太郎 様"
                          className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={() => handleSaveManagementName(friend.id)}
                          disabled={managementNameSaving}
                          className="shrink-0 px-3 py-1 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-opacity"
                          style={{ backgroundColor: '#06C755' }}
                        >
                          {managementNameSaving ? '保存中...' : '保存'}
                        </button>
                      </div>
                      {managementNameError && (
                        <p className="text-xs text-red-600 mt-1">{managementNameError}</p>
                      )}
                    </div>

                    {/* 担当者管理（owner のみ編集可） */}
                    {currentRole === 'owner' && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">担当者管理</p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">主担当</label>
                            <select
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={assignPrimary}
                              onChange={(e) => setAssignPrimary(e.target.value)}
                            >
                              <option value="">未割当</option>
                              {staffList.filter((s) => s.isActive).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">副担当</label>
                            <select
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={assignSecondary}
                              onChange={(e) => setAssignSecondary(e.target.value)}
                            >
                              <option value="">未割当</option>
                              {staffList.filter((s) => s.isActive).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleAssign(friend.id)}
                            disabled={assignLoading}
                            className="px-3 py-1 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-opacity"
                            style={{ backgroundColor: '#06C755' }}
                          >
                            {assignLoading ? '保存中...' : '保存'}
                          </button>
                        </div>
                        {assignError && (
                          <p className="text-xs text-red-600 mt-1">{assignError}</p>
                        )}
                      </div>
                    )}

                    <p className="text-xs font-semibold text-gray-500 mb-2">タグ管理</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {friend.tags.map((tag) => (
                        <TagBadge
                          key={tag.id}
                          tag={tag}
                          onRemove={() => handleRemoveTag(friend.id, tag.id)}
                        />
                      ))}
                    </div>

                    {isAddingTag ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                          value={selectedTagId}
                          onChange={(e) => setSelectedTagId(e.target.value)}
                        >
                          <option value="">タグを選択...</option>
                          {availableTags.map((tag) => (
                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddTag(friend.id)}
                          disabled={!selectedTagId || loading}
                          className="px-3 py-1 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-opacity"
                          style={{ backgroundColor: '#06C755' }}
                        >
                          追加
                        </button>
                        <button
                          onClick={() => { setAddingTagForFriend(null); setSelectedTagId('') }}
                          className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      availableTags.length > 0 && (
                        <button
                          onClick={() => setAddingTagForFriend(friend.id)}
                          className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          タグを追加
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
