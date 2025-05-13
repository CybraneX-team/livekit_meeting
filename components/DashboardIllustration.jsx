'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaVideo, FaCalendarAlt, FaLink, FaPlayCircle, FaUserFriends } from 'react-icons/fa';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

const iconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 10
    }
  },
  hover: {
    scale: 1.1,
    rotate: [0, -5, 5, -5, 0],
    transition: {
      duration: 0.5
    }
  }
};

const IllustrationTypes = {
  NEW_MEETING: 'new-meeting',
  JOIN_MEETING: 'join-meeting',
  SCHEDULE_MEETING: 'schedule-meeting',
  RECORDINGS: 'recordings',
  EMPTY_UPCOMING: 'empty-upcoming',
  EMPTY_PREVIOUS: 'empty-previous',
  EMPTY_RECORDINGS: 'empty-recordings',
  PERSONAL_ROOM: 'personal-room'
};

const DashboardIllustration = ({ type, size = 'md' }) => {
  const sizeClass = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  }[size];
  
  const renderIllustration = () => {
    switch (type) {
      case IllustrationTypes.NEW_MEETING:
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-full opacity-20"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-full opacity-30"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              whileHover="hover"
            >
              <FaVideo className="text-orange-500" size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
            </motion.div>
          </motion.div>
        );
        
      case IllustrationTypes.JOIN_MEETING:
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full opacity-20"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-2 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full opacity-30"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              whileHover="hover"
            >
              <FaLink className="text-purple-500" size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
            </motion.div>
          </motion.div>
        );
        
      case IllustrationTypes.SCHEDULE_MEETING:
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full opacity-20"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-2 bg-gradient-to-br from-violet-400 to-blue-500 rounded-full opacity-30"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              whileHover="hover"
            >
              <FaCalendarAlt className="text-violet-500" size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
            </motion.div>
          </motion.div>
        );
        
      case IllustrationTypes.RECORDINGS:
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full opacity-20"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-30"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              whileHover="hover"
            >
              <FaPlayCircle className="text-yellow-500" size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
            </motion.div>
          </motion.div>
        );
        
      case IllustrationTypes.PERSONAL_ROOM:
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full opacity-20"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full opacity-30"
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
              whileHover="hover"
            >
              <FaUserFriends className="text-emerald-500" size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
            </motion.div>
          </motion.div>
        );
        
      // Empty states
      case IllustrationTypes.EMPTY_UPCOMING:
      case IllustrationTypes.EMPTY_PREVIOUS:
      case IllustrationTypes.EMPTY_RECORDINGS:
        const colors = {
          [IllustrationTypes.EMPTY_UPCOMING]: 'from-blue-500 to-indigo-600 text-blue-500',
          [IllustrationTypes.EMPTY_PREVIOUS]: 'from-gray-500 to-slate-600 text-gray-500',
          [IllustrationTypes.EMPTY_RECORDINGS]: 'from-amber-500 to-yellow-600 text-amber-500'
        };
        
        const icons = {
          [IllustrationTypes.EMPTY_UPCOMING]: <FaCalendarAlt size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />,
          [IllustrationTypes.EMPTY_PREVIOUS]: <FaVideo size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />,
          [IllustrationTypes.EMPTY_RECORDINGS]: <FaPlayCircle size={size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 56} />
        };
        
        return (
          <motion.div 
            className={`relative ${sizeClass}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className={`absolute inset-0 bg-gradient-to-br ${colors[type].split(' ')[0]} ${colors[type].split(' ')[1]} rounded-full opacity-10`}
              variants={itemVariants}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              variants={iconVariants}
            >
              <div className={colors[type].split(' ')[2]}>
                {icons[type]}
              </div>
            </motion.div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };
  
  return renderIllustration();
};

DashboardIllustration.types = IllustrationTypes;

export default DashboardIllustration; 