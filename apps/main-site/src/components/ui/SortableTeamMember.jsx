import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaToggleOn, FaToggleOff, FaTrash, FaEdit } from 'react-icons/fa';

const SortableTeamMember = ({ member, selectedYear, enableSorting, onToggleStatus, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get role and team role for the selected year
  const getRoleForYear = (member, year) => {
    const yearlyRole = member.yearlyRoles?.find(yr => yr.year === year);
    if (yearlyRole) {
      return {
        role: yearlyRole.role,
        teamRole: yearlyRole.teamRole
      };
    }
    return {
      role: member.role,
      teamRole: member.teamRole
    };
  };

  const { role, teamRole } = getRoleForYear(member, selectedYear);

  // Categorize member based on role
  const getCategory = (role, teamRole) => {
    if (role === 'nodal_officer' || (teamRole && teamRole.toLowerCase().includes('faculty'))) {
      return 'Faculty';
    }
    if (['ceo', 'lead', 'co_lead', 'coordinator'].includes(role) || 
        (teamRole && ['President', 'Vice President', 'Secretary', 'Treasurer', 'CEO', 'Lead', 'Co-Lead', 'Coordinator'].some(r => 
          teamRole.toLowerCase().includes(r.toLowerCase())))) {
      return 'Core Team';
    }
    return 'Team Member';
  };

  const category = getCategory(role, teamRole);
  const categoryColors = {
    'Faculty': 'bg-purple-100 text-purple-800',
    'Core Team': 'bg-blue-100 text-blue-800',
    'Team Member': 'bg-green-100 text-green-800'
  };

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 ${isDragging ? 'bg-gray-100' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <button
            className={`text-gray-400 hover:text-gray-600 mr-3 ${
              enableSorting && selectedYear 
                ? 'cursor-grab active:cursor-grabbing' 
                : 'cursor-not-allowed opacity-50'
            }`}
            {...(enableSorting && selectedYear ? attributes : {})}
            {...(enableSorting && selectedYear ? listeners : {})}
            disabled={!enableSorting || !selectedYear}
          >
            <FaGripVertical />
          </button>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-3 flex-shrink-0">
              {member.profilePicture ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${member.profilePicture}`}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs font-medium">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900">{member.name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${categoryColors[category]}`}>
          {category}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {selectedYear ? (
            <>
              {member.yearlyRoles?.find(yr => yr.year === selectedYear) ? (
                <>
                  <div className="font-medium">
                    {member.yearlyRoles.find(yr => yr.year === selectedYear).role}
                  </div>
                  {member.yearlyRoles.find(yr => yr.year === selectedYear).teamRole && (
                    <div className="text-gray-500">
                      {member.yearlyRoles.find(yr => yr.year === selectedYear).teamRole}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">No role for {selectedYear}</span>
              )}
            </>
          ) : (
            <>
              <div className="font-medium">{member.role}</div>
              {member.teamRole && (
                <div className="text-gray-500">{member.teamRole}</div>
              )}
            </>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {(member.teamYears || []).map(year => (
            <span 
              key={year}
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                year === new Date().getFullYear() 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {year}
              {year === new Date().getFullYear() && ' (Current)'}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          member.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {member.isActive ? 'Active' : 'Inactive'}
        </span>
        {!member.password && (
          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {member.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onEdit(member)}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            <FaEdit className="mr-1" />
            Edit
          </button>
          <button
            onClick={() => onToggleStatus(member._id, member.isActive)}
            className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
              member.isActive
                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                : 'text-green-700 bg-green-100 hover:bg-green-200'
            } transition-colors`}
          >
            {member.isActive ? <FaToggleOff className="mr-1" /> : <FaToggleOn className="mr-1" />}
            {member.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(member._id, member.name)}
            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
          >
            <FaTrash className="mr-1" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default SortableTeamMember;
