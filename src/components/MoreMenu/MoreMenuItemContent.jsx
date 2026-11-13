import { MORE_MENU_ICON_FOR } from '../../constants/moreMenuItems';
import { MORE_MENU_ICONS } from './moreMenuIcons';
import './MoreMenu.css';

/**
 * محتوى سطر واحد في قائمة «المزيد»: الأيقونة ثم الاسم الكامل.
 * @param option نصّ الخيار كما في App.jsx (مفتاح الأيقونة)
 * @param label ما يُكتب — يختلف عن option في «لون التطبيق: أخضر»
 * خيار بلا أيقونة مسجّلة يظهر باسمه وحده بدل أن يختفي.
 */
export default function MoreMenuItemContent({ option, label = option }) {
  const icon = MORE_MENU_ICONS[MORE_MENU_ICON_FOR[option]];
  return (
    <>
      {icon && <span className="more-menu-icon">{icon}</span>}
      <span>{label}</span>
    </>
  );
}
